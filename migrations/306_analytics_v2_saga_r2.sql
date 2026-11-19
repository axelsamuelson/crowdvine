-- Analytics V2 Saga runda 2 (R2-B1 + geo clear + order-tolerant closed funnel).
-- Apply ONLY in TEST (msdfjrrokcmjifetuwgc). Do NOT apply to prod from this agent.

-- TEST may lack prod-only exclusion tables; create empty stubs so refresh works.
CREATE TABLE IF NOT EXISTS public.admin_metrics_excluded_profiles (
  profile_id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.analytics_internal_visitor_ids (
  visitor_id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON TABLE public.admin_metrics_excluded_profiles FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.analytics_internal_visitor_ids FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.admin_metrics_excluded_profiles TO service_role;
GRANT SELECT ON TABLE public.analytics_internal_visitor_ids TO service_role;

-- Stub known-bot helper only when missing (never overwrite prod).
DO $$
BEGIN
  IF to_regprocedure('public.is_known_bot_session(text)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.is_known_bot_session(p_session_id text)
      RETURNS boolean
      LANGUAGE sql
      STABLE
      PARALLEL SAFE
      SET search_path = public
      AS $body$ SELECT false $body$;
    $fn$;
    REVOKE ALL ON FUNCTION public.is_known_bot_session(text) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.is_known_bot_session(text) TO service_role;
  END IF;
END $$;

-- ===========================================================================
-- R2-B1 — Products RPC: server-side per-wine aggregation (no 1000-row clip)
-- Respects market / channel / device / invited filters via session facts.
-- ===========================================================================

CREATE OR REPLACE FUNCTION analytics_v2_rpc_products(
  p_site text,
  p_from date,
  p_to date,
  p_market text DEFAULT NULL,
  p_channel text DEFAULT NULL,
  p_device text DEFAULT NULL,
  p_invited text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wines jsonb;
  v_lists jsonb;
  v_unattrib int := 0;
BEGIN
  WITH facts AS (
    SELECT f.*
    FROM analytics_session_facts f
    WHERE f.site = p_site
      AND f.day_sthlm >= p_from
      AND f.day_sthlm <= p_to
      AND f.is_clean
      AND NOT f.is_prerender_suspect
      AND NOT COALESCE(f.is_geo_bot_suspect, false)
      AND (p_channel IS NULL OR p_channel = '' OR f.channel = p_channel)
      AND (p_device IS NULL OR p_device = '' OR f.device = p_device)
      AND (
        p_invited IS NULL OR p_invited = '' OR p_invited = 'all' OR p_invited = 'include'
        OR (p_invited = 'exclude' AND f.is_invited_friend IS NOT TRUE)
      )
      AND (
        p_market IS NULL OR p_market = '' OR p_market = 'all'
        OR (p_market = 'SE' AND f.country_code = 'SE')
        OR (p_market = 'unknown' AND (f.country_code IS NULL OR btrim(f.country_code) = ''))
        OR (p_market = 'other' AND f.country_code IS NOT NULL AND f.country_code <> 'SE')
        OR (p_market NOT IN ('SE', 'unknown', 'other', 'all') AND f.country_code = p_market)
      )
  ),
  viewed AS (
    SELECT
      pid AS product_id,
      COUNT(*) FILTER (WHERE f.reached_pdp)::int AS pdp_sessions,
      COUNT(*) FILTER (WHERE f.added_to_cart AND pid = ANY (f.product_ids_added))::int AS cart_sessions,
      COUNT(*) FILTER (WHERE f.reached_checkout)::int AS checkout_sessions,
      COUNT(*) FILTER (WHERE f.purchased)::int AS purchase_sessions
    FROM facts f
    CROSS JOIN LATERAL unnest(COALESCE(f.product_ids_viewed, '{}'::text[])) AS pid
    WHERE pid IS NOT NULL AND btrim(pid) <> ''
    GROUP BY pid
  ),
  listed AS (
    SELECT
      pid AS product_id,
      COUNT(DISTINCT f.session_id)::int AS list_sessions
    FROM facts f
    JOIN user_events ue
      ON ue.session_id = f.session_id
     AND ue.event_type = 'product_list_viewed'
    CROSS JOIN LATERAL jsonb_array_elements_text(
      CASE
        WHEN jsonb_typeof(ue.event_metadata->'productIds') = 'array'
          THEN ue.event_metadata->'productIds'
        ELSE '[]'::jsonb
      END
    ) AS pid
    WHERE pid IS NOT NULL AND btrim(pid) <> ''
    GROUP BY pid
  ),
  merged AS (
    SELECT
      COALESCE(v.product_id, l.product_id) AS product_id,
      COALESCE(l.list_sessions, 0) AS list_sessions,
      COALESCE(v.pdp_sessions, 0) AS pdp_sessions,
      COALESCE(v.cart_sessions, 0) AS cart_sessions,
      COALESCE(v.checkout_sessions, 0) AS checkout_sessions,
      COALESCE(v.purchase_sessions, 0) AS purchase_sessions
    FROM viewed v
    FULL OUTER JOIN listed l ON l.product_id = v.product_id
  ),
  named AS (
    SELECT
      m.product_id,
      COALESCE(
        w.wine_name,
        w2.wine_name,
        (
          SELECT pd.product_name
          FROM analytics_product_daily pd
          WHERE pd.product_id = m.product_id
            AND pd.product_name IS NOT NULL
          ORDER BY pd.day_sthlm DESC
          LIMIT 1
        ),
        m.product_id
      ) AS product_name,
      m.list_sessions,
      m.pdp_sessions,
      m.cart_sessions,
      m.checkout_sessions,
      m.purchase_sessions
    FROM merged m
    LEFT JOIN wines w
      ON w.id::text = m.product_id
    LEFT JOIN wines w2
      ON w2.handle = m.product_id
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'product_id', product_id,
        'product_name', product_name,
        'list_sessions', list_sessions,
        'pdp_sessions', pdp_sessions,
        'cart_sessions', cart_sessions,
        'checkout_sessions', checkout_sessions,
        'purchase_sessions', purchase_sessions
      )
      ORDER BY pdp_sessions DESC, list_sessions DESC, product_name
    ),
    '[]'::jsonb
  )
  INTO v_wines
  FROM named;

  WITH facts AS (
    SELECT f.session_id, f.landing_path, f.reached_plp
    FROM analytics_session_facts f
    WHERE f.site = p_site
      AND f.day_sthlm >= p_from
      AND f.day_sthlm <= p_to
      AND f.is_clean
      AND NOT f.is_prerender_suspect
      AND NOT COALESCE(f.is_geo_bot_suspect, false)
      AND (p_channel IS NULL OR p_channel = '' OR f.channel = p_channel)
      AND (p_device IS NULL OR p_device = '' OR f.device = p_device)
      AND (
        p_invited IS NULL OR p_invited = '' OR p_invited = 'all' OR p_invited = 'include'
        OR (p_invited = 'exclude' AND f.is_invited_friend IS NOT TRUE)
      )
      AND (
        p_market IS NULL OR p_market = '' OR p_market = 'all'
        OR (p_market = 'SE' AND f.country_code = 'SE')
        OR (p_market = 'unknown' AND (f.country_code IS NULL OR btrim(f.country_code) = ''))
        OR (p_market = 'other' AND f.country_code IS NOT NULL AND f.country_code <> 'SE')
        OR (p_market NOT IN ('SE', 'unknown', 'other', 'all') AND f.country_code = p_market)
      )
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object('path', path, 'sessions', sessions)
      ORDER BY sessions DESC
    ),
    '[]'::jsonb
  )
  INTO v_lists
  FROM (
    SELECT COALESCE(NULLIF(landing_path, ''), '/') AS path, COUNT(*)::int AS sessions
    FROM facts
    WHERE reached_plp
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 40
  ) s;

  SELECT COUNT(*)::int
  INTO v_unattrib
  FROM analytics_session_facts f
  WHERE f.site = p_site
    AND f.day_sthlm >= p_from
    AND f.day_sthlm <= p_to
    AND f.is_clean
    AND NOT f.is_prerender_suspect
    AND NOT COALESCE(f.is_geo_bot_suspect, false)
    AND f.reached_pdp
    AND (f.product_ids_viewed IS NULL OR cardinality(f.product_ids_viewed) = 0)
    AND (p_channel IS NULL OR p_channel = '' OR f.channel = p_channel)
    AND (p_device IS NULL OR p_device = '' OR f.device = p_device)
    AND (
      p_invited IS NULL OR p_invited = '' OR p_invited = 'all' OR p_invited = 'include'
      OR (p_invited = 'exclude' AND f.is_invited_friend IS NOT TRUE)
    )
    AND (
      p_market IS NULL OR p_market = '' OR p_market = 'all'
      OR (p_market = 'SE' AND f.country_code = 'SE')
      OR (p_market = 'unknown' AND (f.country_code IS NULL OR btrim(f.country_code) = ''))
      OR (p_market = 'other' AND f.country_code IS NOT NULL AND f.country_code <> 'SE')
      OR (p_market NOT IN ('SE', 'unknown', 'other', 'all') AND f.country_code = p_market)
    );

  RETURN jsonb_build_object(
    'wines', COALESCE(v_wines, '[]'::jsonb),
    'lists', COALESCE(v_lists, '[]'::jsonb),
    'unattributed_pdp', COALESCE(v_unattrib, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION analytics_v2_rpc_products(text, date, date, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION analytics_v2_rpc_products(text, date, date, text, text, text, text)
  TO service_role;

COMMENT ON FUNCTION analytics_v2_rpc_products(text, date, date, text, text, text, text) IS
  'Saga R2-B1: per-wine product aggregates from facts (filters respected; no PostgREST row clip).';

-- Fill product_name on product_daily from wines (wine_name / handle)
UPDATE analytics_product_daily pd
SET product_name = w.wine_name
FROM wines w
WHERE pd.product_name IS NULL
  AND w.id::text = pd.product_id
  AND w.wine_name IS NOT NULL;

UPDATE analytics_product_daily pd
SET product_name = w.wine_name
FROM wines w
WHERE pd.product_name IS NULL
  AND w.handle = pd.product_id
  AND w.wine_name IS NOT NULL;

-- ===========================================================================
-- Point 8 — Geo flag must recompute / clear (no sticky discarded OR)
-- ===========================================================================

CREATE OR REPLACE FUNCTION analytics_apply_geo_bot_flags()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_flagged int := 0;
  v_cleared int := 0;
BEGIN
  -- Clear sessions that no longer match the Saga rule (and drop sticky discard rows).
  WITH still_match AS (
    SELECT f.session_id
    FROM analytics_session_facts f
    WHERE analytics_is_geo_bot_suspect(
      f.country_code,
      f.channel,
      (f.referrer_domain IS NOT NULL AND btrim(f.referrer_domain) <> ''),
      f.page_views,
      f.duration_s,
      EXISTS (
        SELECT 1 FROM user_events ue
        WHERE ue.session_id = f.session_id
          AND ue.event_type IN (
            'session_engaged', 'add_to_cart', 'cart_opened', 'search_submitted',
            'checkout_started', 'checkout_step_viewed', 'checkout_abandoned',
            'reservation_completed', 'checkout_error', 'checkout_stripe_confirm_failed'
          )
      )
    )
  )
  DELETE FROM analytics_geo_bot_discarded_sessions d
  WHERE NOT EXISTS (SELECT 1 FROM still_match s WHERE s.session_id = d.session_id);

  UPDATE analytics_session_facts f
  SET
    is_geo_bot_suspect = false,
    is_clean = CASE
      WHEN f.exclusion_reason = 'geo_bot_suspect'
           AND NOT f.is_prerender_suspect
        THEN true
      ELSE f.is_clean
    END,
    exclusion_reason = CASE
      WHEN f.exclusion_reason = 'geo_bot_suspect' THEN NULL
      ELSE f.exclusion_reason
    END
  WHERE f.is_geo_bot_suspect
    AND NOT analytics_is_geo_bot_suspect(
      f.country_code,
      f.channel,
      (f.referrer_domain IS NOT NULL AND btrim(f.referrer_domain) <> ''),
      f.page_views,
      f.duration_s,
      EXISTS (
        SELECT 1 FROM user_events ue
        WHERE ue.session_id = f.session_id
          AND ue.event_type IN (
            'session_engaged', 'add_to_cart', 'cart_opened', 'search_submitted',
            'checkout_started', 'checkout_step_viewed', 'checkout_abandoned',
            'reservation_completed', 'checkout_error', 'checkout_stripe_confirm_failed'
          )
      )
    );

  GET DIAGNOSTICS v_cleared = ROW_COUNT;

  INSERT INTO analytics_geo_bot_discarded_sessions (
    session_id, country_code, started_at, events, duration_s, rule
  )
  SELECT
    f.session_id,
    f.country_code,
    f.started_at,
    f.events,
    f.duration_s,
    'saga_geo_cn_sg_hk_direct_short'
  FROM analytics_session_facts f
  WHERE analytics_is_geo_bot_suspect(
    f.country_code,
    f.channel,
    (f.referrer_domain IS NOT NULL AND btrim(f.referrer_domain) <> ''),
    f.page_views,
    f.duration_s,
    EXISTS (
      SELECT 1 FROM user_events ue
      WHERE ue.session_id = f.session_id
        AND ue.event_type IN (
          'session_engaged', 'add_to_cart', 'cart_opened', 'search_submitted',
          'checkout_started', 'checkout_step_viewed', 'checkout_abandoned',
          'reservation_completed', 'checkout_error', 'checkout_stripe_confirm_failed'
        )
    )
  )
  ON CONFLICT (session_id) DO UPDATE SET
    country_code = EXCLUDED.country_code,
    started_at = EXCLUDED.started_at,
    events = EXCLUDED.events,
    duration_s = EXCLUDED.duration_s,
    rule = EXCLUDED.rule;

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
    f.country_code,
    f.channel,
    (f.referrer_domain IS NOT NULL AND btrim(f.referrer_domain) <> ''),
    f.page_views,
    f.duration_s,
    EXISTS (
      SELECT 1 FROM user_events ue
      WHERE ue.session_id = f.session_id
        AND ue.event_type IN (
          'session_engaged', 'add_to_cart', 'cart_opened', 'search_submitted',
          'checkout_started', 'checkout_step_viewed', 'checkout_abandoned',
          'reservation_completed', 'checkout_error', 'checkout_stripe_confirm_failed'
        )
    )
  );

  GET DIAGNOSTICS v_flagged = ROW_COUNT;

  RETURN jsonb_build_object(
    'ok', true,
    'flagged', v_flagged,
    'cleared', v_cleared
  );
END;
$$;

REVOKE ALL ON FUNCTION analytics_apply_geo_bot_flags() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION analytics_apply_geo_bot_flags() TO service_role;

COMMENT ON FUNCTION analytics_apply_geo_bot_flags() IS
  'Saga R2: soft geo flag; clears discarded rows + facts when rule no longer matches (no sticky OR).';

-- ===========================================================================
-- Point 9 — Closed funnel: order-tolerant (reached step, ignore revisit order)
-- ===========================================================================

CREATE OR REPLACE FUNCTION analytics_v2_rpc_closed_funnel(
  p_site text,
  p_from date,
  p_to date,
  p_market text DEFAULT NULL,
  p_channel text DEFAULT NULL,
  p_device text DEFAULT NULL,
  p_invited text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v jsonb;
BEGIN
  -- Closed = must have reached each prior step, but timestamps may be out of order
  -- (e.g. PDP → PLP → PDP still counts as reached PLP and PDP).
  WITH facts AS (
    SELECT
      f.session_id,
      f.purchased,
      f.reached_plp,
      f.reached_pdp,
      f.added_to_cart,
      f.reached_checkout
    FROM analytics_session_facts f
    WHERE f.site = p_site
      AND f.day_sthlm >= p_from
      AND f.day_sthlm <= p_to
      AND f.is_clean
      AND NOT f.is_prerender_suspect
      AND NOT COALESCE(f.is_geo_bot_suspect, false)
      AND (p_channel IS NULL OR p_channel = '' OR f.channel = p_channel)
      AND (p_device IS NULL OR p_device = '' OR f.device = p_device)
      AND (
        p_invited IS NULL OR p_invited = '' OR p_invited = 'all' OR p_invited = 'include'
        OR (p_invited = 'exclude' AND f.is_invited_friend IS NOT TRUE)
      )
      AND (
        p_market IS NULL OR p_market = '' OR p_market = 'all'
        OR (p_market = 'SE' AND f.country_code = 'SE')
        OR (p_market = 'unknown' AND (f.country_code IS NULL OR btrim(f.country_code) = ''))
        OR (p_market = 'other' AND f.country_code IS NOT NULL AND f.country_code <> 'SE')
        OR (p_market NOT IN ('SE', 'unknown', 'other', 'all') AND f.country_code = p_market)
      )
  ),
  scored AS (
    SELECT
      session_id,
      true AS s_sessions,
      reached_plp AS s_plp,
      (reached_plp AND reached_pdp) AS s_pdp,
      (reached_plp AND reached_pdp AND added_to_cart) AS s_cart,
      (reached_plp AND reached_pdp AND added_to_cart AND reached_checkout) AS s_checkout,
      (
        reached_plp AND reached_pdp AND added_to_cart AND reached_checkout AND purchased
      ) AS s_purchase
    FROM facts
  )
  SELECT jsonb_build_object(
    'sessions', COUNT(*)::int,
    'plp', COUNT(*) FILTER (WHERE s_plp)::int,
    'pdp', COUNT(*) FILTER (WHERE s_pdp)::int,
    'cart', COUNT(*) FILTER (WHERE s_cart)::int,
    'checkout', COUNT(*) FILTER (WHERE s_checkout)::int,
    'purchases', COUNT(*) FILTER (WHERE s_purchase)::int,
    'mode', 'closed_order_tolerant',
    'steps', jsonb_build_array('sessions', 'plp', 'pdp', 'cart', 'checkout', 'purchase')
  )
  INTO v
  FROM scored;

  RETURN COALESCE(v, jsonb_build_object(
    'sessions', 0, 'plp', 0, 'pdp', 0, 'cart', 0, 'checkout', 0, 'purchases', 0
  ));
END;
$$;

COMMENT ON FUNCTION analytics_v2_rpc_closed_funnel(text, date, date, text, text, text, text) IS
  'Saga R2: closed funnel without Engaged; order-tolerant (reached flags, not timestamp order).';

-- Also set product_name during refresh going forward (patch product_daily insert path
-- would require replacing the whole refresh fn; name join above + RPC cover reads).
