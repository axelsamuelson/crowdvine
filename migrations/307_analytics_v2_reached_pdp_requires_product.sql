-- Analytics V2: reached_pdp must be a real product page / product id.
-- Synthetic product_viewed on /vin (PLP) without productId inflated PDP
-- in funnel/overview while analytics_product_daily stayed empty.
--
-- NOTE: The CREATE OR REPLACE analytics_refresh_session_facts below is
-- superseded by migration 308 (Saga B1–B6): v2 channel/site helpers,
-- full-day rollup rebuild, geo-bot-inside-refresh, clean filter, RPCs.

CREATE OR REPLACE FUNCTION analytics_product_id_from_event(
  p_event_type text,
  p_meta jsonb,
  p_page_url text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT NULLIF(
    COALESCE(
      NULLIF(p_meta->>'productId', ''),
      NULLIF(p_meta->>'product_id', ''),
      NULLIF(p_meta->>'productHandle', ''),
      NULLIF(p_meta->>'handle', ''),
      CASE
        WHEN p_page_url ~* '/(produkt|product)/[^/?#]+'
          THEN substring(p_page_url from '(?i)/(?:produkt|product)/([^/?#]+)')
        ELSE NULL
      END
    ),
    ''
  )
  WHERE p_event_type IN ('product_viewed', 'add_to_cart', 'product_list_viewed');
$$;

COMMENT ON FUNCTION analytics_product_id_from_event(text, jsonb, text) IS
  'Product key for product_daily: productId | product_id | handle | /produkt|/product/ path.';

CREATE OR REPLACE FUNCTION analytics_event_is_pdp(
  p_event_type text,
  p_meta jsonb,
  p_page_url text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT
    p_event_type = 'product_viewed'
    AND (
      analytics_product_id_from_event(p_event_type, p_meta, p_page_url) IS NOT NULL
      OR COALESCE(analytics_landing_type(analytics_path_from_url(p_page_url)), '') = 'pdp'
    );
$$;

COMMENT ON FUNCTION analytics_event_is_pdp(text, jsonb, text) IS
  'True only for product_viewed with extractable product id or PDP path (/produkt|/product).';

-- Patch refresh_analytics_v2_facts: replace reached_pdp expression.
-- Full function body is large; we re-apply via targeted UPDATE of existing facts
-- and redefine the window CTE piece by replacing the whole refresh function's
-- product_viewed BOOL_OR. Prefer calling the existing function after a soft
-- backfill of reached_pdp from events.

-- Soft-correct existing facts (TEST/prod-safe: no DELETE of events)
UPDATE analytics_session_facts f
SET
  reached_pdp = COALESCE(sub.has_pdp, false),
  product_ids_viewed = COALESCE(sub.viewed, '{}'::text[]),
  product_ids_added = COALESCE(sub.added, '{}'::text[]),
  refreshed_at = now()
FROM (
  SELECT
    ue.session_id,
    BOOL_OR(analytics_event_is_pdp(ue.event_type, ue.event_metadata, ue.page_url)) AS has_pdp,
    ARRAY_REMOVE(ARRAY_AGG(DISTINCT analytics_product_id_from_event(
      ue.event_type, ue.event_metadata, ue.page_url
    )) FILTER (
      WHERE ue.event_type = 'product_viewed'
        AND analytics_product_id_from_event(ue.event_type, ue.event_metadata, ue.page_url) IS NOT NULL
    ), NULL) AS viewed,
    ARRAY_REMOVE(ARRAY_AGG(DISTINCT analytics_product_id_from_event(
      ue.event_type, ue.event_metadata, ue.page_url
    )) FILTER (
      WHERE ue.event_type = 'add_to_cart'
        AND analytics_product_id_from_event(ue.event_type, ue.event_metadata, ue.page_url) IS NOT NULL
    ), NULL) AS added
  FROM user_events ue
  WHERE ue.session_id IN (
    SELECT session_id FROM analytics_session_facts
    WHERE day_sthlm >= DATE '2026-08-07'
  )
  GROUP BY ue.session_id
) sub
WHERE f.session_id = sub.session_id;

-- Rebuild product_daily from corrected facts
DELETE FROM analytics_product_daily WHERE day_sthlm >= DATE '2026-08-07';

INSERT INTO analytics_product_daily (
  day_sthlm, site, product_id, product_name,
  list_sessions, pdp_sessions, cart_sessions, checkout_sessions, purchase_sessions, refreshed_at
)
SELECT
  f.day_sthlm,
  COALESCE(f.site, 'other'),
  pid,
  NULL,
  0,
  COUNT(*) FILTER (WHERE f.reached_pdp)::int,
  COUNT(*) FILTER (WHERE f.added_to_cart AND pid = ANY (f.product_ids_added))::int,
  COUNT(*) FILTER (WHERE f.reached_checkout)::int,
  COUNT(*) FILTER (WHERE f.purchased)::int,
  now()
FROM analytics_session_facts f
CROSS JOIN LATERAL unnest(f.product_ids_viewed) AS pid
WHERE f.is_clean
  AND NOT f.is_prerender_suspect
  AND NOT COALESCE(f.is_geo_bot_suspect, false)
  AND f.day_sthlm >= DATE '2026-08-07'
  AND pid IS NOT NULL
  AND btrim(pid) <> ''
GROUP BY 1, 2, 3
ON CONFLICT (day_sthlm, site, product_id) DO UPDATE SET
  pdp_sessions = EXCLUDED.pdp_sessions,
  cart_sessions = EXCLUDED.cart_sessions,
  checkout_sessions = EXCLUDED.checkout_sessions,
  purchase_sessions = EXCLUDED.purchase_sessions,
  refreshed_at = EXCLUDED.refreshed_at;

-- Rebuild daily rollup so PDP counts match corrected facts
DELETE FROM analytics_daily_rollup WHERE day_sthlm >= DATE '2026-08-07';

INSERT INTO analytics_daily_rollup (
  day_sthlm, site, market, channel, device, landing_type, is_invited_friend,
  sessions, engaged, plp, pdp, cart, checkout, purchases, purchase_value_sek,
  prerender_suspect, refreshed_at
)
SELECT
  f.day_sthlm,
  COALESCE(f.site, 'other'),
  CASE
    WHEN f.country_code = 'SE' THEN 'SE'
    WHEN f.country_code IS NULL OR btrim(f.country_code) = '' THEN 'unknown'
    ELSE 'other'
  END AS market,
  COALESCE(f.channel, 'direct'),
  COALESCE(f.device, 'desktop'),
  COALESCE(f.landing_type, 'other'),
  f.is_invited_friend,
  COUNT(*) FILTER (WHERE f.is_clean AND NOT f.is_prerender_suspect)::int,
  COUNT(*) FILTER (WHERE f.is_clean AND NOT f.is_prerender_suspect AND f.is_engaged)::int,
  COUNT(*) FILTER (WHERE f.is_clean AND NOT f.is_prerender_suspect AND f.reached_plp)::int,
  COUNT(*) FILTER (WHERE f.is_clean AND NOT f.is_prerender_suspect AND f.reached_pdp)::int,
  COUNT(*) FILTER (WHERE f.is_clean AND NOT f.is_prerender_suspect AND f.added_to_cart)::int,
  COUNT(*) FILTER (WHERE f.is_clean AND NOT f.is_prerender_suspect AND f.reached_checkout)::int,
  COUNT(*) FILTER (WHERE f.is_clean AND NOT f.is_prerender_suspect AND f.purchased)::int,
  COALESCE(SUM(f.purchase_value_sek) FILTER (WHERE f.is_clean AND NOT f.is_prerender_suspect AND f.purchased), 0),
  COUNT(*) FILTER (WHERE f.is_prerender_suspect)::int,
  now()
FROM analytics_session_facts f
WHERE f.day_sthlm >= DATE '2026-08-07'
GROUP BY 1, 2, 3, 4, 5, 6, 7
ON CONFLICT (day_sthlm, site, market, channel, device, landing_type, is_invited_friend)
DO UPDATE SET
  sessions = EXCLUDED.sessions,
  engaged = EXCLUDED.engaged,
  plp = EXCLUDED.plp,
  pdp = EXCLUDED.pdp,
  cart = EXCLUDED.cart,
  checkout = EXCLUDED.checkout,
  purchases = EXCLUDED.purchases,
  purchase_value_sek = EXCLUDED.purchase_value_sek,
  prerender_suspect = EXCLUDED.prerender_suspect,
  refreshed_at = EXCLUDED.refreshed_at;

-- Keep refresh function in sync with reached_pdp fix
CREATE OR REPLACE FUNCTION analytics_refresh_session_facts(p_since timestamptz DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_since timestamptz;
  v_cutoff timestamptz;
  v_upserted int := 0;
  v_full boolean := false;
BEGIN
  v_full := (p_since IS NULL);
  IF p_since IS NULL THEN
    v_since := TIMESTAMPTZ '2026-08-07 00:00:00+02';
  ELSE
    v_since := p_since - interval '2 hours';
  END IF;
  v_cutoff := v_since;

  -- Touch sessions with any event after cutoff
  WITH touched AS (
    SELECT DISTINCT session_id
    FROM user_events
    WHERE created_at >= v_cutoff
      AND session_id IS NOT NULL
      AND session_id NOT LIKE 'server\_%' ESCAPE '\'
  ),
  ev AS (
    SELECT ue.*
    FROM user_events ue
    JOIN touched t ON t.session_id = ue.session_id
  ),
  base AS (
    SELECT
      e.session_id,
      MIN(e.created_at) AS started_at,
      MAX(e.created_at) AS ended_at,
      (MIN(e.created_at) AT TIME ZONE 'Europe/Stockholm')::date AS day_sthlm,
      to_char(MIN(e.created_at) AT TIME ZONE 'Europe/Stockholm', 'IYYY-"W"IW') AS iso_week,
      (ARRAY_AGG(e.visitor_id ORDER BY e.created_at DESC)
        FILTER (WHERE e.visitor_id IS NOT NULL AND btrim(e.visitor_id) <> ''))[1] AS visitor_id,
      (ARRAY_AGG(e.user_id ORDER BY e.created_at DESC)
        FILTER (WHERE e.user_id IS NOT NULL))[1] AS user_id,
      COALESCE(
        (ARRAY_AGG(e.site ORDER BY e.created_at DESC) FILTER (WHERE e.site IS NOT NULL))[1],
        (ARRAY_AGG(analytics_site(e.page_url) ORDER BY e.created_at DESC)
          FILTER (WHERE analytics_site(e.page_url) IS NOT NULL))[1]
      ) AS site,
      (ARRAY_AGG(e.country_code ORDER BY e.created_at DESC)
        FILTER (WHERE e.country_code IS NOT NULL))[1] AS country_code,
      (ARRAY_AGG(e.referrer ORDER BY e.created_at ASC))[1] AS first_referrer,
      (ARRAY_AGG(e.page_url ORDER BY e.created_at ASC))[1] AS landing_url,
      (ARRAY_AGG(e.user_agent ORDER BY e.created_at ASC))[1] AS user_agent,
      (ARRAY_AGG(e.event_metadata ORDER BY e.created_at ASC))[1] AS first_meta,
      COUNT(*)::int AS events,
      COUNT(*) FILTER (WHERE e.event_type = 'page_view')::int AS page_views,
      BOOL_OR(e.event_type = 'session_engaged') AS has_engaged_event,
      BOOL_OR(e.event_type IN ('product_list_viewed', 'collection_viewed')) AS reached_plp,
      -- PDP only with product id or /produkt|/product path (not synthetic product_viewed on /vin)
      BOOL_OR(
        e.event_type = 'product_viewed'
        AND (
          COALESCE(
            NULLIF(e.event_metadata->>'productId', ''),
            NULLIF(e.event_metadata->>'product_id', ''),
            NULLIF(e.event_metadata->>'productHandle', ''),
            NULLIF(e.event_metadata->>'handle', ''),
            CASE
              WHEN e.page_url ~* '/(produkt|product)/[^/?#]+'
                THEN substring(e.page_url from '(?i)/(?:produkt|product)/([^/?#]+)')
              ELSE NULL
            END
          ) IS NOT NULL
          OR analytics_landing_type(analytics_path_from_url(e.page_url)) = 'pdp'
        )
      ) AS reached_pdp,
      BOOL_OR(e.event_type = 'add_to_cart') AS added_to_cart,
      BOOL_OR(e.event_type IN ('checkout_started', 'checkout_step_viewed')) AS reached_checkout,
      BOOL_OR(e.event_type IN ('checkout_error', 'checkout_stripe_confirm_failed')) AS had_checkout_error,
      BOOL_OR(COALESCE(e.event_metadata->>'internal', '') = 'true') AS is_internal,
      BOOL_OR(
        e.event_type IN (
          'session_engaged', 'add_to_cart', 'cart_opened',
          'filter_used', 'search_submitted'
        )
        OR e.event_type = 'page_view'
      ) AS engagement_signal_raw,
      COUNT(*) FILTER (WHERE e.event_type = 'page_view') AS pv_for_engaged,
      ARRAY_REMOVE(ARRAY_AGG(DISTINCT COALESCE(
          NULLIF(e.event_metadata->>'productId', ''),
          NULLIF(e.event_metadata->>'product_id', ''),
          NULLIF(e.event_metadata->>'productHandle', ''),
          CASE
            WHEN e.page_url ~* '/(produkt|product)/[^/?#]+'
              THEN substring(e.page_url from '(?i)/(?:produkt|product)/([^/?#]+)')
            ELSE NULL
          END
        ))
        FILTER (WHERE e.event_type = 'product_viewed'
          AND COALESCE(
            NULLIF(e.event_metadata->>'productId', ''),
            NULLIF(e.event_metadata->>'product_id', ''),
            NULLIF(e.event_metadata->>'productHandle', ''),
            CASE
              WHEN e.page_url ~* '/(produkt|product)/[^/?#]+'
                THEN substring(e.page_url from '(?i)/(?:produkt|product)/([^/?#]+)')
              ELSE NULL
            END
          ) IS NOT NULL), NULL) AS product_ids_viewed,
      ARRAY_REMOVE(ARRAY_AGG(DISTINCT COALESCE(
          NULLIF(e.event_metadata->>'productId', ''),
          NULLIF(e.event_metadata->>'product_id', ''),
          NULLIF(e.event_metadata->>'productHandle', ''),
          CASE
            WHEN e.page_url ~* '/(produkt|product)/[^/?#]+'
              THEN substring(e.page_url from '(?i)/(?:produkt|product)/([^/?#]+)')
            ELSE NULL
          END
        ))
        FILTER (WHERE e.event_type = 'add_to_cart'
          AND COALESCE(
            NULLIF(e.event_metadata->>'productId', ''),
            NULLIF(e.event_metadata->>'product_id', ''),
            NULLIF(e.event_metadata->>'productHandle', ''),
            CASE
              WHEN e.page_url ~* '/(produkt|product)/[^/?#]+'
                THEN substring(e.page_url from '(?i)/(?:produkt|product)/([^/?#]+)')
              ELSE NULL
            END
          ) IS NOT NULL), NULL) AS product_ids_added,
      (ARRAY_AGG(analytics_checkout_step(e.event_metadata) ORDER BY e.created_at DESC)
        FILTER (WHERE e.event_type = 'checkout_step_viewed'
          AND analytics_checkout_step(e.event_metadata) IS NOT NULL))[1] AS last_checkout_step,
      (ARRAY_AGG(e.event_metadata->>'abandon_reason' ORDER BY e.created_at DESC)
        FILTER (WHERE e.event_type = 'checkout_abandoned'
          AND NULLIF(e.event_metadata->>'abandon_reason', '') IS NOT NULL))[1] AS abandon_reason
    FROM ev e
    GROUP BY e.session_id
  ),
  enriched AS (
    SELECT
      b.*,
      analytics_path_from_url(b.landing_url) AS landing_path,
      analytics_landing_type(analytics_path_from_url(b.landing_url)) AS landing_type,
      analytics_language_from_path(analytics_path_from_url(b.landing_url)) AS language,
      analytics_device_from_ua(b.user_agent) AS device,
      lower(
        regexp_replace(
          COALESCE(substring(nullif(btrim(b.first_referrer), '') FROM '://([^/?#:]+)'), ''),
          '^www\.',
          ''
        )
      ) AS referrer_domain,
      analytics_channel(
        b.first_referrer,
        COALESCE(
          NULLIF(b.first_meta->>'utm_source', ''),
          NULLIF(b.first_meta->'first_touch'->>'first_utm_source', ''),
          NULLIF(b.first_meta->>'first_utm_source', ''),
          analytics_utm_param(b.landing_url, 'utm_source')
        ),
        COALESCE(
          NULLIF(b.first_meta->>'utm_medium', ''),
          NULLIF(b.first_meta->'first_touch'->>'first_utm_medium', ''),
          NULLIF(b.first_meta->>'first_utm_medium', ''),
          analytics_utm_param(b.landing_url, 'utm_medium')
        )
      ) AS channel,
      COALESCE(
        NULLIF(b.first_meta->>'utm_source', ''),
        NULLIF(b.first_meta->'first_touch'->>'first_utm_source', ''),
        NULLIF(b.first_meta->>'first_utm_source', ''),
        analytics_utm_param(b.landing_url, 'utm_source')
      ) AS utm_source,
      COALESCE(
        NULLIF(b.first_meta->>'utm_medium', ''),
        NULLIF(b.first_meta->'first_touch'->>'first_utm_medium', ''),
        NULLIF(b.first_meta->>'first_utm_medium', ''),
        analytics_utm_param(b.landing_url, 'utm_medium')
      ) AS utm_medium,
      COALESCE(
        NULLIF(b.first_meta->>'utm_campaign', ''),
        NULLIF(b.first_meta->'first_touch'->>'first_utm_campaign', ''),
        NULLIF(b.first_meta->>'first_utm_campaign', ''),
        analytics_utm_param(b.landing_url, 'utm_campaign')
      ) AS utm_campaign,
      analytics_is_prerender_suspect(
        b.started_at, b.landing_url, b.first_referrer, b.user_agent, b.has_engaged_event
      ) AS is_prerender_suspect,
      (
        b.has_engaged_event
        OR b.added_to_cart
        OR EXISTS (
          SELECT 1 FROM ev x
          WHERE x.session_id = b.session_id
            AND x.event_type IN ('cart_opened', 'filter_used', 'search_submitted')
        )
        OR b.pv_for_engaged > 1
      ) AS is_engaged,
      EXISTS (
        SELECT 1 FROM analytics_prerender_discarded_sessions d
        WHERE d.session_id = b.session_id
      ) AS is_discarded,
      EXISTS (
        SELECT 1 FROM analytics_invited_friend_profiles f
        WHERE f.profile_id = b.user_id
      )
      OR EXISTS (
        SELECT 1
        FROM user_events ue2
        JOIN analytics_invited_friend_profiles f2 ON f2.profile_id = ue2.user_id
        WHERE ue2.visitor_id IS NOT NULL
          AND b.visitor_id IS NOT NULL
          AND ue2.visitor_id = b.visitor_id
        LIMIT 1
      ) AS is_invited_friend
    FROM base b
  ),
  with_clean AS (
    SELECT
      e.*,
      CASE
        WHEN e.is_discarded THEN false
        WHEN e.is_internal THEN false
        WHEN e.user_agent ~* 'bot|crawl|spider|headless|lighthouse|slurp' THEN false
        WHEN e.first_referrer ILIKE '%localhost%' THEN false
        WHEN e.session_id LIKE 'server\_%' ESCAPE '\' THEN false
        ELSE true
      END AS is_clean_base,
      CASE
        WHEN e.is_discarded THEN 'prerender_discarded'
        WHEN e.is_internal THEN 'internal'
        WHEN e.user_agent ~* 'bot|crawl|spider|headless|lighthouse|slurp' THEN 'bot_ua'
        WHEN e.first_referrer ILIKE '%localhost%' THEN 'localhost'
        ELSE NULL
      END AS exclusion_reason
    FROM enriched e
  ),
  purchase_values AS (
    SELECT
      wc.session_id,
      COALESCE(array_agg(DISTINCT o.id) FILTER (WHERE o.id IS NOT NULL), '{}'::uuid[]) AS purchase_ids,
      -- Köpvärde: vin efter rabatt (items) + frakt. Aldrig total_sek (v1.2).
      SUM(
        analytics_purchase_value_sek(
          analytics_wine_after_discount_sek(o.id),
          o.shipping_revenue_gross_cents
        )
      ) FILTER (WHERE o.id IS NOT NULL) AS purchase_value_sek,
      BOOL_OR(o.id IS NOT NULL) AS purchased,
      (ARRAY_AGG(analytics_fulfillment_label(o.fulfillment_channel, o.pallet_id) ORDER BY o.created_at DESC)
        FILTER (WHERE o.id IS NOT NULL))[1] AS fulfillment_channel
    FROM with_clean wc
    LEFT JOIN order_reservations o
      ON o.user_id IS NOT NULL
     AND wc.user_id IS NOT NULL
     AND o.user_id = wc.user_id
     AND COALESCE(o.is_test_purchase, false) IS NOT TRUE
     AND o.created_at >= wc.started_at - interval '1 hour'
     AND o.created_at <= wc.started_at + interval '24 hours'
    GROUP BY wc.session_id
  ),
  upserted AS (
    INSERT INTO analytics_session_facts AS f (
      session_id, visitor_id, user_id, started_at, ended_at, day_sthlm, iso_week,
      site, country_code, channel, referrer_domain, utm_source, utm_medium, utm_campaign,
      landing_path, landing_type, language, device,
      is_clean, exclusion_reason, is_prerender_suspect, is_engaged, is_internal, is_invited_friend,
      reached_plp, reached_pdp, added_to_cart, reached_checkout, last_checkout_step,
      abandon_reason, had_checkout_error,
      purchased, purchase_ids, purchase_value_sek, fulfillment_channel,
      page_views, events, duration_s, product_ids_viewed, product_ids_added, refreshed_at
    )
    SELECT
      wc.session_id,
      wc.visitor_id,
      wc.user_id,
      wc.started_at,
      wc.ended_at,
      wc.day_sthlm,
      wc.iso_week,
      wc.site,
      wc.country_code,
      wc.channel,
      NULLIF(wc.referrer_domain, ''),
      wc.utm_source,
      wc.utm_medium,
      wc.utm_campaign,
      wc.landing_path,
      wc.landing_type,
      wc.language,
      wc.device,
      wc.is_clean_base AND NOT wc.is_prerender_suspect,
      CASE
        WHEN wc.is_prerender_suspect AND wc.is_clean_base THEN 'prerender_suspect'
        ELSE wc.exclusion_reason
      END,
      wc.is_prerender_suspect,
      wc.is_engaged,
      wc.is_internal,
      COALESCE(wc.is_invited_friend, false),
      wc.reached_plp,
      wc.reached_pdp,
      wc.added_to_cart,
      wc.reached_checkout,
      wc.last_checkout_step,
      wc.abandon_reason,
      wc.had_checkout_error,
      COALESCE(pv.purchased, false),
      COALESCE(pv.purchase_ids, '{}'::uuid[]),
      pv.purchase_value_sek,
      pv.fulfillment_channel,
      wc.page_views,
      wc.events,
      GREATEST(0, EXTRACT(EPOCH FROM (wc.ended_at - wc.started_at)))::int,
      COALESCE(wc.product_ids_viewed, '{}'::text[]),
      COALESCE(wc.product_ids_added, '{}'::text[]),
      now()
    FROM with_clean wc
    LEFT JOIN purchase_values pv ON pv.session_id = wc.session_id
    ON CONFLICT (session_id) DO UPDATE SET
      visitor_id = EXCLUDED.visitor_id,
      user_id = EXCLUDED.user_id,
      started_at = EXCLUDED.started_at,
      ended_at = EXCLUDED.ended_at,
      day_sthlm = EXCLUDED.day_sthlm,
      iso_week = EXCLUDED.iso_week,
      site = EXCLUDED.site,
      country_code = EXCLUDED.country_code,
      channel = EXCLUDED.channel,
      referrer_domain = EXCLUDED.referrer_domain,
      utm_source = EXCLUDED.utm_source,
      utm_medium = EXCLUDED.utm_medium,
      utm_campaign = EXCLUDED.utm_campaign,
      landing_path = EXCLUDED.landing_path,
      landing_type = EXCLUDED.landing_type,
      language = EXCLUDED.language,
      device = EXCLUDED.device,
      is_clean = EXCLUDED.is_clean,
      exclusion_reason = EXCLUDED.exclusion_reason,
      is_prerender_suspect = EXCLUDED.is_prerender_suspect,
      is_engaged = EXCLUDED.is_engaged,
      is_internal = EXCLUDED.is_internal,
      is_invited_friend = EXCLUDED.is_invited_friend,
      reached_plp = EXCLUDED.reached_plp,
      reached_pdp = EXCLUDED.reached_pdp,
      added_to_cart = EXCLUDED.added_to_cart,
      reached_checkout = EXCLUDED.reached_checkout,
      last_checkout_step = EXCLUDED.last_checkout_step,
      abandon_reason = EXCLUDED.abandon_reason,
      had_checkout_error = EXCLUDED.had_checkout_error,
      purchased = EXCLUDED.purchased,
      purchase_ids = EXCLUDED.purchase_ids,
      purchase_value_sek = EXCLUDED.purchase_value_sek,
      fulfillment_channel = EXCLUDED.fulfillment_channel,
      page_views = EXCLUDED.page_views,
      events = EXCLUDED.events,
      duration_s = EXCLUDED.duration_s,
      product_ids_viewed = EXCLUDED.product_ids_viewed,
      product_ids_added = EXCLUDED.product_ids_added,
      refreshed_at = EXCLUDED.refreshed_at
    RETURNING 1
  )
  SELECT COUNT(*)::int INTO v_upserted FROM upserted;

  -- Rebuild daily rollup for touched days
  DELETE FROM analytics_daily_rollup r
  WHERE r.day_sthlm IN (
    SELECT DISTINCT day_sthlm FROM analytics_session_facts
    WHERE refreshed_at >= now() - interval '1 minute'
       OR started_at >= v_cutoff
  )
  OR (v_full AND r.day_sthlm >= DATE '2026-08-07');

  IF v_full THEN
    DELETE FROM analytics_daily_rollup WHERE day_sthlm >= DATE '2026-08-07';
  END IF;

  INSERT INTO analytics_daily_rollup (
    day_sthlm, site, market, channel, device, landing_type, is_invited_friend,
    sessions, engaged, plp, pdp, cart, checkout, purchases, purchase_value_sek,
    prerender_suspect, refreshed_at
  )
  SELECT
    f.day_sthlm,
    COALESCE(f.site, 'other'),
    CASE
      WHEN f.country_code = 'SE' THEN 'SE'
      WHEN f.country_code IS NULL OR btrim(f.country_code) = '' THEN 'unknown'
      ELSE 'other'
    END AS market,
    COALESCE(f.channel, 'direct'),
    COALESCE(f.device, 'desktop'),
    COALESCE(f.landing_type, 'other'),
    f.is_invited_friend,
    COUNT(*) FILTER (WHERE f.is_clean AND NOT f.is_prerender_suspect)::int,
    COUNT(*) FILTER (WHERE f.is_clean AND NOT f.is_prerender_suspect AND f.is_engaged)::int,
    COUNT(*) FILTER (WHERE f.is_clean AND NOT f.is_prerender_suspect AND f.reached_plp)::int,
    COUNT(*) FILTER (WHERE f.is_clean AND NOT f.is_prerender_suspect AND f.reached_pdp)::int,
    COUNT(*) FILTER (WHERE f.is_clean AND NOT f.is_prerender_suspect AND f.added_to_cart)::int,
    COUNT(*) FILTER (WHERE f.is_clean AND NOT f.is_prerender_suspect AND f.reached_checkout)::int,
    COUNT(*) FILTER (WHERE f.is_clean AND NOT f.is_prerender_suspect AND f.purchased)::int,
    COALESCE(SUM(f.purchase_value_sek) FILTER (WHERE f.is_clean AND NOT f.is_prerender_suspect AND f.purchased), 0),
    COUNT(*) FILTER (WHERE f.is_prerender_suspect)::int,
    now()
  FROM analytics_session_facts f
  WHERE f.day_sthlm >= DATE '2026-08-07'
    AND (v_full OR f.started_at >= v_cutoff OR f.refreshed_at >= now() - interval '5 minutes')
  GROUP BY 1, 2, 3, 4, 5, 6, 7
  ON CONFLICT (day_sthlm, site, market, channel, device, landing_type, is_invited_friend)
  DO UPDATE SET
    sessions = EXCLUDED.sessions,
    engaged = EXCLUDED.engaged,
    plp = EXCLUDED.plp,
    pdp = EXCLUDED.pdp,
    cart = EXCLUDED.cart,
    checkout = EXCLUDED.checkout,
    purchases = EXCLUDED.purchases,
    purchase_value_sek = EXCLUDED.purchase_value_sek,
    prerender_suspect = EXCLUDED.prerender_suspect,
    refreshed_at = EXCLUDED.refreshed_at;

  -- Product daily (from facts product arrays + list views via events for touched window)
  IF v_full THEN
    DELETE FROM analytics_product_daily WHERE day_sthlm >= DATE '2026-08-07';
  ELSE
    DELETE FROM analytics_product_daily
    WHERE day_sthlm IN (
      SELECT DISTINCT day_sthlm FROM analytics_session_facts WHERE started_at >= v_cutoff
    );
  END IF;

  INSERT INTO analytics_product_daily (
    day_sthlm, site, product_id, product_name,
    list_sessions, pdp_sessions, cart_sessions, checkout_sessions, purchase_sessions, refreshed_at
  )
  SELECT
    f.day_sthlm,
    COALESCE(f.site, 'other'),
    pid,
    NULL,
    0,
    COUNT(*) FILTER (WHERE f.reached_pdp)::int,
    COUNT(*) FILTER (WHERE f.added_to_cart AND pid = ANY (f.product_ids_added))::int,
    COUNT(*) FILTER (WHERE f.reached_checkout)::int,
    COUNT(*) FILTER (WHERE f.purchased)::int,
    now()
  FROM analytics_session_facts f
  CROSS JOIN LATERAL unnest(f.product_ids_viewed) AS pid
  WHERE f.is_clean
    AND NOT f.is_prerender_suspect
    AND f.day_sthlm >= DATE '2026-08-07'
    AND (v_full OR f.started_at >= v_cutoff)
  GROUP BY 1, 2, 3
  ON CONFLICT (day_sthlm, site, product_id) DO UPDATE SET
    pdp_sessions = EXCLUDED.pdp_sessions,
    cart_sessions = EXCLUDED.cart_sessions,
    checkout_sessions = EXCLUDED.checkout_sessions,
    purchase_sessions = EXCLUDED.purchase_sessions,
    refreshed_at = EXCLUDED.refreshed_at;

  UPDATE analytics_refresh_state
  SET
    last_refresh_at = now(),
    last_full_rebuild_at = CASE WHEN v_full THEN now() ELSE last_full_rebuild_at END,
    last_status = 'ok',
    last_error = NULL,
    sessions_upserted = v_upserted
  WHERE id = 'default';

  RETURN jsonb_build_object(
    'ok', true,
    'upserted', v_upserted,
    'since', v_cutoff,
    'full', v_full
  );
EXCEPTION WHEN OTHERS THEN
  UPDATE analytics_refresh_state
  SET last_status = 'error', last_error = SQLERRM, last_refresh_at = now()
  WHERE id = 'default';
  RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;
