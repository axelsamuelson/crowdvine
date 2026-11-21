-- Analytics V2 etapp 1 — v1.2 adjustments (köpvärde + CN/SG/HK geo-bot heuristic).
-- TEST-only apply by agent. No DELETE of user_events.

-- ---------------------------------------------------------------------------
-- Köpvärde (6.3 / H5): NEVER use total_sek.
-- wine_after_discount from items economics_snapshot.unit_gross_revenue_cents
-- + shipping_revenue_gross_cents/100. NULL when wine cannot be derived.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION analytics_wine_after_discount_sek(p_reservation_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT CASE
    WHEN COUNT(*) FILTER (
      WHERE ori.economics_snapshot ? 'unit_gross_revenue_cents'
    ) = 0 THEN NULL
    ELSE ROUND(
      SUM(
        COALESCE((ori.economics_snapshot->>'unit_gross_revenue_cents')::numeric, 0)
        * COALESCE(ori.quantity, 1)
      ) / 100.0
      - COALESCE(
          (
            SELECT r.discount_amount_sek
            FROM order_reservations r
            WHERE r.id = p_reservation_id
          ),
          0
        )
    , 2)
  END
  FROM order_reservation_items ori
  WHERE ori.reservation_id = p_reservation_id;
$$;

-- DROP first: CREATE OR REPLACE cannot rename args (e.g. legacy p_total_sek).
DROP FUNCTION IF EXISTS analytics_purchase_value_sek(numeric, bigint);

CREATE OR REPLACE FUNCTION analytics_purchase_value_sek(
  p_wine_after_discount_sek numeric,
  p_shipping_cents bigint
)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  -- Returns NULL when wine portion unknown (do not fall back to total_sek).
  SELECT CASE
    WHEN p_wine_after_discount_sek IS NULL
         AND p_shipping_cents IS NULL THEN NULL
    WHEN p_wine_after_discount_sek IS NULL THEN NULL
    ELSE ROUND(
      p_wine_after_discount_sek
      + CASE WHEN p_shipping_cents IS NULL THEN 0 ELSE p_shipping_cents::numeric / 100.0 END
    , 2)
  END;
$$;

COMMENT ON FUNCTION analytics_purchase_value_sek(numeric, bigint) IS
  'Köpvärde = vin efter rabatt + shipping_revenue_gross_cents/100. Never total_sek (v1.2).';

-- ---------------------------------------------------------------------------
-- Geo-bot heuristic (v1.2 / Q14): CN, SG, HK + behavior — NOT country alone.
-- Behavior: channel=direct, duration_s < 1, events <= 2, not engaged.
-- Flagged sessions are excluded from clean counts; whole countries are not.
-- ---------------------------------------------------------------------------

ALTER TABLE analytics_session_facts
  ADD COLUMN IF NOT EXISTS is_geo_bot_suspect boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS analytics_geo_bot_discarded_sessions (
  session_id text PRIMARY KEY,
  flagged_at timestamptz NOT NULL DEFAULT now(),
  rule text NOT NULL DEFAULT 'geo_cn_sg_hk_direct_short',
  country_code text,
  started_at timestamptz,
  events int,
  duration_s int
);

CREATE OR REPLACE FUNCTION analytics_is_geo_bot_suspect(
  p_country_code text,
  p_channel text,
  p_duration_s int,
  p_events int,
  p_engaged boolean
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT
    upper(COALESCE(p_country_code, '')) IN ('CN', 'SG', 'HK')
    AND COALESCE(p_channel, '') = 'direct'
    AND COALESCE(p_duration_s, 0) < 1
    AND COALESCE(p_events, 0) <= 2
    AND COALESCE(p_engaged, false) IS NOT TRUE;
$$;

COMMENT ON FUNCTION analytics_is_geo_bot_suspect(text, text, int, int, boolean) IS
  'v1.2 geo-bot: CN/SG/HK AND direct AND duration<1s AND events<=2 AND not engaged. Never country-only.';

-- Flag historical matches (soft; no DELETE)
INSERT INTO analytics_geo_bot_discarded_sessions (
  session_id, country_code, started_at, events, duration_s, rule
)
SELECT
  f.session_id,
  f.country_code,
  f.started_at,
  f.events,
  f.duration_s,
  'geo_cn_sg_hk_direct_short'
FROM analytics_session_facts f
WHERE analytics_is_geo_bot_suspect(
  f.country_code, f.channel, f.duration_s, f.events, f.is_engaged
)
ON CONFLICT (session_id) DO NOTHING;

UPDATE analytics_session_facts f
SET
  is_geo_bot_suspect = true,
  is_clean = false,
  exclusion_reason = CASE
    WHEN f.exclusion_reason IS NULL OR f.exclusion_reason = '' THEN 'geo_bot_suspect'
    ELSE f.exclusion_reason
  END
WHERE analytics_is_geo_bot_suspect(
  f.country_code, f.channel, f.duration_s, f.events, f.is_engaged
)
OR EXISTS (
  SELECT 1 FROM analytics_geo_bot_discarded_sessions d
  WHERE d.session_id = f.session_id
);

-- Allow NULL köpvärde when wine cannot be derived without total_sek
ALTER TABLE analytics_session_facts
  ALTER COLUMN purchase_value_sek DROP NOT NULL;

-- Recompute köpvärde for purchased sessions (no total_sek)
UPDATE analytics_session_facts f
SET purchase_value_sek = sub.v
FROM (
  SELECT
    f2.session_id,
    (
      SELECT SUM(
        analytics_purchase_value_sek(
          analytics_wine_after_discount_sek(oid),
          (SELECT r.shipping_revenue_gross_cents FROM order_reservations r WHERE r.id = oid)
        )
      )
      FROM unnest(f2.purchase_ids) AS oid
    ) AS v
  FROM analytics_session_facts f2
  WHERE f2.purchased
) sub
WHERE f.session_id = sub.session_id;

-- Rebuild rollup purchase_value from facts (touched days since 2026-08-07)
UPDATE analytics_daily_rollup r
SET purchase_value_sek = s.v,
    refreshed_at = now()
FROM (
  SELECT
    f.day_sthlm,
    COALESCE(f.site, 'other') AS site,
    CASE
      WHEN f.country_code = 'SE' THEN 'SE'
      WHEN f.country_code IS NULL OR btrim(f.country_code) = '' THEN 'unknown'
      ELSE 'other'
    END AS market,
    COALESCE(f.channel, 'direct') AS channel,
    COALESCE(f.device, 'desktop') AS device,
    COALESCE(f.landing_type, 'other') AS landing_type,
    f.is_invited_friend,
    COALESCE(SUM(f.purchase_value_sek) FILTER (
      WHERE f.is_clean AND NOT f.is_prerender_suspect AND NOT f.is_geo_bot_suspect AND f.purchased
    ), 0) AS v
  FROM analytics_session_facts f
  WHERE f.day_sthlm >= DATE '2026-08-07'
  GROUP BY 1, 2, 3, 4, 5, 6, 7
) s
WHERE r.day_sthlm = s.day_sthlm
  AND r.site = s.site
  AND r.market = s.market
  AND r.channel = s.channel
  AND r.device = s.device
  AND r.landing_type = s.landing_type
  AND r.is_invited_friend = s.is_invited_friend;

-- Annotation for visibility of series break
INSERT INTO admin_analytics_annotations (
  date, occurred_at, label, category, site, source
)
SELECT
  (now() AT TIME ZONE 'Europe/Stockholm')::date,
  now(),
  'Geo-botheuristik CN/SG/HK (beteende) aktiv',
  'incident',
  'pact',
  'e5'
WHERE NOT EXISTS (
  SELECT 1 FROM admin_analytics_annotations
  WHERE label = 'Geo-botheuristik CN/SG/HK (beteende) aktiv'
);

REVOKE ALL ON TABLE analytics_geo_bot_discarded_sessions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON analytics_geo_bot_discarded_sessions TO service_role;
GRANT SELECT ON analytics_geo_bot_discarded_sessions TO authenticated;

-- ---------------------------------------------------------------------------
-- Post-refresh applicator: cron calls this after analytics_refresh_session_facts
-- so geo flags survive incremental rebuilds (refresh itself does not know geo yet).
-- Soft flag only — never DELETE user_events.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION analytics_apply_geo_bot_flags()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_flagged int := 0;
BEGIN
  INSERT INTO analytics_geo_bot_discarded_sessions (
    session_id, country_code, started_at, events, duration_s, rule
  )
  SELECT
    f.session_id,
    f.country_code,
    f.started_at,
    f.events,
    f.duration_s,
    'geo_cn_sg_hk_direct_short'
  FROM analytics_session_facts f
  WHERE analytics_is_geo_bot_suspect(
    f.country_code, f.channel, f.duration_s, f.events, f.is_engaged
  )
  ON CONFLICT (session_id) DO NOTHING;

  UPDATE analytics_session_facts f
  SET
    is_geo_bot_suspect = true,
    is_clean = false,
    exclusion_reason = CASE
      WHEN f.exclusion_reason IS NULL OR f.exclusion_reason = '' THEN 'geo_bot_suspect'
      WHEN f.exclusion_reason = 'geo_bot_suspect' THEN f.exclusion_reason
      ELSE f.exclusion_reason
    END
  WHERE analytics_is_geo_bot_suspect(
    f.country_code, f.channel, f.duration_s, f.events, f.is_engaged
  )
  OR EXISTS (
    SELECT 1 FROM analytics_geo_bot_discarded_sessions d
    WHERE d.session_id = f.session_id
  );

  GET DIAGNOSTICS v_flagged = ROW_COUNT;

  -- Clear geo flag on sessions that no longer match (and were only geo-excluded)
  UPDATE analytics_session_facts f
  SET
    is_geo_bot_suspect = false,
    is_clean = CASE
      WHEN f.exclusion_reason IN ('geo_bot_suspect', 'prerender_suspect')
           AND NOT f.is_prerender_suspect
           AND f.exclusion_reason = 'geo_bot_suspect'
        THEN true
      ELSE f.is_clean
    END,
    exclusion_reason = CASE
      WHEN f.exclusion_reason = 'geo_bot_suspect' THEN NULL
      ELSE f.exclusion_reason
    END
  WHERE f.is_geo_bot_suspect
    AND NOT analytics_is_geo_bot_suspect(
      f.country_code, f.channel, f.duration_s, f.events, f.is_engaged
    )
    AND NOT EXISTS (
      SELECT 1 FROM analytics_geo_bot_discarded_sessions d
      WHERE d.session_id = f.session_id
    );

  RETURN jsonb_build_object('ok', true, 'flagged', v_flagged);
END;
$$;

REVOKE ALL ON FUNCTION analytics_apply_geo_bot_flags() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION analytics_apply_geo_bot_flags() TO service_role;

COMMENT ON FUNCTION analytics_apply_geo_bot_flags() IS
  'v1.2: soft-flag CN/SG/HK direct short sessions after facts refresh. No DELETE.';
