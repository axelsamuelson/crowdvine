-- Analytics V2 Saga blockers B1–B6 (+ related facts fixes).
-- Apply in TEST first. Do NOT apply to prod from this agent run.
--
-- B1: Stop overwriting prod analytics_site/channel; add analytics_v2_* helpers;
--     restore prod channel from 187 and site from 177.
-- B2: Incremental rollup/product_daily rebuilds ALL facts for touched day_sthlm.
-- B3: Saga geo-bot rule; flag inside refresh before rollup; rollup excludes geo.
-- B4: RLS + revoke on V2 fact/rollup tables (+ invited view grants).
-- B5: Clean filter closer to analytics_sessions_clean (excluded profiles,
--     internal visitors, known bots, bot UA, localhost, server_, internal).
-- B6: SECURITY DEFINER aggregate RPCs (no 1000-row silent truncate).
-- Also: country_code = first non-null; list_sessions from product_list_viewed;
--       checkout_steps_seen text[] on facts.

-- ===========================================================================
-- B1 — V2 site/channel helpers (do not use for prod clean views)
-- ===========================================================================

CREATE OR REPLACE FUNCTION analytics_v2_site(page_url text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public, pg_temp
AS $$
  -- Subdomain-aware variant (TEST currently had this on analytics_site).
  -- Prod analytics_site is restored to 177-simple below for compatibility.
  SELECT CASE
    WHEN page_url IS NULL OR btrim(page_url) = '' THEN NULL
    WHEN lower(
      regexp_replace(
        COALESCE(substring(page_url FROM '://([^/?#:]+)'), ''),
        '^www\.',
        ''
      )
    ) IN ('pactwines.com')
      OR lower(
        regexp_replace(
          COALESCE(substring(page_url FROM '://([^/?#:]+)'), ''),
          '^www\.',
          ''
        )
      ) LIKE '%.pactwines.com'
      THEN 'pact'
    WHEN lower(
      regexp_replace(
        COALESCE(substring(page_url FROM '://([^/?#:]+)'), ''),
        '^www\.',
        ''
      )
    ) IN ('dirtywine.se')
      OR lower(
        regexp_replace(
          COALESCE(substring(page_url FROM '://([^/?#:]+)'), ''),
          '^www\.',
          ''
        )
      ) LIKE '%.dirtywine.se'
      THEN 'dirtywine'
    ELSE NULL
  END;
$$;

COMMENT ON FUNCTION analytics_v2_site(text) IS
  'V2 site helper (subdomain-aware). Prod analytics_site remains 177-simple.';

CREATE OR REPLACE FUNCTION analytics_v2_channel(
  referrer text,
  utm_source text,
  utm_medium text
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
SET search_path = public, pg_temp
AS $$
DECLARE
  host text;
  src text;
  med text;
BEGIN
  host := lower(
    regexp_replace(
      COALESCE(
        substring(nullif(btrim(referrer), '') FROM '://([^/?#:]+)'),
        CASE
          WHEN nullif(btrim(referrer), '') IS NULL THEN NULL
          WHEN btrim(referrer) ~* '^https?://' THEN NULL
          ELSE split_part(split_part(lower(btrim(referrer)), '/', 1), '?', 1)
        END
      ),
      '^www\.',
      ''
    )
  );
  IF host = '' THEN
    host := NULL;
  END IF;

  src := nullif(lower(btrim(COALESCE(utm_source, ''))), '');
  med := nullif(lower(btrim(COALESCE(utm_medium, ''))), '');

  -- 1. Internal
  IF host IS NOT NULL AND (
    host = 'pactwines.com'
    OR host LIKE '%.pactwines.com'
    OR host = 'dirtywine.se'
    OR host LIKE '%.dirtywine.se'
  ) THEN
    RETURN 'internal';
  END IF;

  -- 2. Paid
  IF med IN ('cpc', 'ppc', 'paid', 'paidsocial', 'display') THEN
    RETURN 'paid';
  END IF;

  -- 3. Social — host/domain boundaries; utm exact tokens (incl. exact "x");
  --    NEVER substring t\.co (would match chatgpt.com). Use host = t.co.
  IF med IN ('social', 'social-organic')
     OR (
       host IS NOT NULL AND (
         host = 't.co'
         OR host ~ '(^|\.)t\.co$'
         OR host ~* '(^|\.)(instagram\.com|facebook\.com|fb\.com|tiktok\.com|linkedin\.com|twitter\.com|x\.com|threads\.net|pinterest\.com|reddit\.com|snapchat\.com)$'
         OR host ~* '(^|\.)(instagram|facebook|tiktok|linkedin|twitter|threads|pinterest|reddit|snapchat)\.'
       )
     )
     OR (
       src IS NOT NULL AND (
         src IN (
           'instagram', 'facebook', 'fb', 'ig', 'tiktok', 'linkedin',
           'twitter', 'x', 'x.com', 'twitter.com', 'pinterest',
           'threads', 'snapchat', 'reddit'
         )
         OR src ~ '^(ig|fb|tt)$'
       )
     )
  THEN
    RETURN 'social';
  END IF;

  -- 4. Organic (incl. brave, qwant)
  IF med IN ('organic', 'seo')
     OR (
       src IS NOT NULL AND src IN (
         'google', 'bing', 'duckduckgo', 'yahoo', 'baidu', 'ecosia',
         'yandex', 'brave', 'qwant'
       )
     )
     OR (
       host IS NOT NULL AND (
         host ~* '(^|\.)(google\.|bing\.|duckduckgo\.|yahoo\.|baidu\.|ecosia\.|yandex\.|brave\.|qwant\.)'
         OR host ~* '(brave|qwant)'
       )
     )
  THEN
    RETURN 'organic';
  END IF;

  -- 5. AI (after social/organic; chatgpt.com is AI, not social)
  IF (
       src IS NOT NULL AND src ~* '(chatgpt|openai|perplexity|claude|gemini|copilot|you\.com|phind)'
     )
     OR (
       host IS NOT NULL AND host ~* '(chatgpt|openai|perplexity|claude|gemini|copilot|you\.com|phind)'
     )
  THEN
    RETURN 'ai';
  END IF;

  -- 6. Referral: other external host, or tagged UTM that did not match above
  IF host IS NOT NULL OR src IS NOT NULL OR med IS NOT NULL THEN
    RETURN 'referral';
  END IF;

  -- 7. Direct
  RETURN 'direct';
END;
$$;

COMMENT ON FUNCTION analytics_v2_channel(text, text, text) IS
  'V2 channel classifier. Order: internal, paid, social, organic, ai, referral, direct. Fixed social/AI regexes (no bare-x / t.co substring).';

REVOKE ALL ON FUNCTION analytics_v2_site(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION analytics_v2_channel(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION analytics_v2_site(text) TO service_role;
GRANT EXECUTE ON FUNCTION analytics_v2_channel(text, text, text) TO service_role;

-- Saga R2: do NOT recreate prod analytics_site / analytics_channel here.
-- They stay as 177 / 187. V2 refresh uses analytics_v2_site / analytics_v2_channel above.

-- ===========================================================================
-- B3 — Saga geo-bot rule (expanded signature)
-- ===========================================================================

-- Drop legacy v1.2 signature (events/engaged based) and any prior Saga overload.
DROP FUNCTION IF EXISTS analytics_is_geo_bot_suspect(text, text, int, int, boolean);
DROP FUNCTION IF EXISTS analytics_is_geo_bot_suspect(text, text, boolean, int, int, boolean);

CREATE OR REPLACE FUNCTION analytics_is_geo_bot_suspect(
  p_country_code text,
  p_channel text,
  p_has_referrer boolean,
  p_page_views int,
  p_duration_s int,
  p_has_geo_engagement boolean
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public, pg_temp
AS $$
  -- Saga: CN/SG/HK AND direct AND no referrer AND page_views<=1 AND duration_s<10
  -- AND NOT (session_engaged|add_to_cart|cart_opened|search_submitted|checkout*).
  -- filter_used does NOT count as engagement (caller must exclude it).
  SELECT
    upper(COALESCE(p_country_code, '')) IN ('CN', 'SG', 'HK')
    AND COALESCE(p_channel, '') = 'direct'
    AND COALESCE(p_has_referrer, false) IS NOT TRUE
    AND COALESCE(p_page_views, 0) <= 1
    AND COALESCE(p_duration_s, 0) < 10
    AND COALESCE(p_has_geo_engagement, false) IS NOT TRUE;
$$;

COMMENT ON FUNCTION analytics_is_geo_bot_suspect(text, text, boolean, int, int, boolean) IS
  'Saga geo-bot: CN/SG/HK + direct + no referrer + pv<=1 + duration<10s + no geo-engagement (filter_used excluded).';

ALTER TABLE analytics_session_facts
  ADD COLUMN IF NOT EXISTS checkout_steps_seen text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN analytics_session_facts.checkout_steps_seen IS
  'Distinct checkout_step_viewed steps seen in session (postal/delivery/age_terms/payment).';

-- ===========================================================================
-- B3/B5/B2/B1 — Full refresh (supersedes 297/304 body)
-- ===========================================================================

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
        (ARRAY_AGG(analytics_v2_site(e.page_url) ORDER BY e.created_at DESC)
          FILTER (WHERE analytics_v2_site(e.page_url) IS NOT NULL))[1]
      ) AS site,
      -- FIRST non-null country_code in session
      (ARRAY_AGG(e.country_code ORDER BY e.created_at ASC)
        FILTER (WHERE e.country_code IS NOT NULL AND btrim(e.country_code) <> ''))[1] AS country_code,
      (ARRAY_AGG(e.referrer ORDER BY e.created_at ASC))[1] AS first_referrer,
      (ARRAY_AGG(e.page_url ORDER BY e.created_at ASC))[1] AS landing_url,
      (ARRAY_AGG(e.user_agent ORDER BY e.created_at ASC))[1] AS user_agent,
      (ARRAY_AGG(e.event_metadata ORDER BY e.created_at ASC))[1] AS first_meta,
      COUNT(*)::int AS events,
      COUNT(*) FILTER (WHERE e.event_type = 'page_view')::int AS page_views,
      BOOL_OR(e.event_type = 'session_engaged') AS has_engaged_event,
      BOOL_OR(e.event_type IN ('product_list_viewed', 'collection_viewed')) AS reached_plp,
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
      -- Geo engagement: filter_used does NOT count
      BOOL_OR(
        e.event_type IN (
          'session_engaged', 'add_to_cart', 'cart_opened', 'search_submitted',
          'checkout_started', 'checkout_step_viewed', 'checkout_abandoned',
          'reservation_completed', 'checkout_error', 'checkout_stripe_confirm_failed'
        )
      ) AS has_geo_engagement,
      BOOL_OR(
        e.user_agent IS NOT NULL
        AND e.user_agent ~* 'bot|crawl|spider|headless|lighthouse|slurp'
      ) AS has_bot_ua_any,
      BOOL_OR(
        e.referrer IS NOT NULL AND e.referrer ILIKE '%localhost%'
      ) AS has_localhost_referrer,
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
      ARRAY_REMOVE(ARRAY_AGG(DISTINCT analytics_checkout_step(e.event_metadata))
        FILTER (WHERE e.event_type = 'checkout_step_viewed'
          AND analytics_checkout_step(e.event_metadata) IS NOT NULL), NULL) AS checkout_steps_seen,
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
      analytics_v2_channel(
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
      ) AS is_invited_friend,
      EXISTS (
        SELECT 1 FROM admin_metrics_excluded_profiles ex
        WHERE b.user_id IS NOT NULL AND ex.profile_id = b.user_id
      ) AS is_excluded_profile,
      EXISTS (
        SELECT 1 FROM analytics_internal_visitor_ids iv
        WHERE b.visitor_id IS NOT NULL AND iv.visitor_id = b.visitor_id
      ) AS is_internal_visitor,
      COALESCE(public.is_known_bot_session(b.session_id), false) AS is_known_bot
    FROM base b
  ),
  with_flags AS (
    SELECT
      e.*,
      GREATEST(0, EXTRACT(EPOCH FROM (e.ended_at - e.started_at)))::int AS duration_s,
      (NULLIF(e.referrer_domain, '') IS NOT NULL
        OR (e.first_referrer IS NOT NULL AND btrim(e.first_referrer) <> '')) AS has_referrer
    FROM enriched e
  ),
  with_geo AS (
    SELECT
      w.*,
      analytics_is_geo_bot_suspect(
        w.country_code,
        w.channel,
        w.has_referrer,
        w.page_views,
        w.duration_s,
        w.has_geo_engagement
      ) AS is_geo_bot_suspect
    FROM with_flags w
  ),
  with_clean AS (
    SELECT
      g.*,
      CASE
        WHEN g.is_discarded THEN false
        WHEN g.is_internal THEN false
        WHEN g.is_excluded_profile THEN false
        WHEN g.is_internal_visitor THEN false
        WHEN g.is_known_bot THEN false
        WHEN g.has_bot_ua_any THEN false
        WHEN g.has_localhost_referrer THEN false
        WHEN g.session_id LIKE 'server\_%' ESCAPE '\' THEN false
        WHEN g.is_prerender_suspect THEN false
        WHEN g.is_geo_bot_suspect THEN false
        ELSE true
      END AS is_clean_final,
      CASE
        WHEN g.is_discarded THEN 'prerender_discarded'
        WHEN g.is_internal THEN 'internal'
        WHEN g.is_excluded_profile THEN 'excluded_profile'
        WHEN g.is_internal_visitor THEN 'internal_visitor'
        WHEN g.is_known_bot THEN 'known_bot'
        WHEN g.has_bot_ua_any THEN 'bot_ua'
        WHEN g.has_localhost_referrer THEN 'localhost'
        WHEN g.is_prerender_suspect THEN 'prerender_suspect'
        WHEN g.is_geo_bot_suspect THEN 'geo_bot_suspect'
        ELSE NULL
      END AS exclusion_reason
    FROM with_geo g
  ),
  purchase_values AS (
    SELECT
      wc.session_id,
      COALESCE(array_agg(DISTINCT o.id) FILTER (WHERE o.id IS NOT NULL), '{}'::uuid[]) AS purchase_ids,
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
      is_clean, exclusion_reason, is_prerender_suspect, is_geo_bot_suspect,
      is_engaged, is_internal, is_invited_friend,
      reached_plp, reached_pdp, added_to_cart, reached_checkout, last_checkout_step,
      checkout_steps_seen, abandon_reason, had_checkout_error,
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
      wc.is_clean_final,
      wc.exclusion_reason,
      wc.is_prerender_suspect,
      wc.is_geo_bot_suspect,
      wc.is_engaged,
      wc.is_internal,
      COALESCE(wc.is_invited_friend, false),
      wc.reached_plp,
      wc.reached_pdp,
      wc.added_to_cart,
      wc.reached_checkout,
      wc.last_checkout_step,
      COALESCE(wc.checkout_steps_seen, '{}'::text[]),
      wc.abandon_reason,
      wc.had_checkout_error,
      COALESCE(pv.purchased, false),
      COALESCE(pv.purchase_ids, '{}'::uuid[]),
      pv.purchase_value_sek,
      pv.fulfillment_channel,
      wc.page_views,
      wc.events,
      wc.duration_s,
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
      is_geo_bot_suspect = EXCLUDED.is_geo_bot_suspect,
      is_engaged = EXCLUDED.is_engaged,
      is_internal = EXCLUDED.is_internal,
      is_invited_friend = EXCLUDED.is_invited_friend,
      reached_plp = EXCLUDED.reached_plp,
      reached_pdp = EXCLUDED.reached_pdp,
      added_to_cart = EXCLUDED.added_to_cart,
      reached_checkout = EXCLUDED.reached_checkout,
      last_checkout_step = EXCLUDED.last_checkout_step,
      checkout_steps_seen = EXCLUDED.checkout_steps_seen,
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
    RETURNING session_id, day_sthlm, is_geo_bot_suspect, country_code, started_at, events, duration_s
  ),
  geo_discard AS (
    INSERT INTO analytics_geo_bot_discarded_sessions (
      session_id, country_code, started_at, events, duration_s, rule
    )
    SELECT
      u.session_id, u.country_code, u.started_at, u.events, u.duration_s,
      'saga_geo_cn_sg_hk_direct_short'
    FROM upserted u
    WHERE u.is_geo_bot_suspect
    ON CONFLICT (session_id) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*)::int INTO v_upserted
  FROM upserted
  WHERE (SELECT COUNT(*) FROM geo_discard) >= 0;

  -- B2: delete rollup for touched days, then rebuild from ALL facts on those days
  IF v_full THEN
    DELETE FROM analytics_daily_rollup WHERE day_sthlm >= DATE '2026-08-07';
  ELSE
    DELETE FROM analytics_daily_rollup r
    WHERE r.day_sthlm IN (
      SELECT DISTINCT day_sthlm FROM analytics_session_facts
      WHERE refreshed_at >= now() - interval '1 minute'
         OR started_at >= v_cutoff
    );
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
    COUNT(*) FILTER (
      WHERE f.is_clean AND NOT f.is_prerender_suspect AND NOT f.is_geo_bot_suspect
    )::int,
    COUNT(*) FILTER (
      WHERE f.is_clean AND NOT f.is_prerender_suspect AND NOT f.is_geo_bot_suspect AND f.is_engaged
    )::int,
    COUNT(*) FILTER (
      WHERE f.is_clean AND NOT f.is_prerender_suspect AND NOT f.is_geo_bot_suspect AND f.reached_plp
    )::int,
    COUNT(*) FILTER (
      WHERE f.is_clean AND NOT f.is_prerender_suspect AND NOT f.is_geo_bot_suspect AND f.reached_pdp
    )::int,
    COUNT(*) FILTER (
      WHERE f.is_clean AND NOT f.is_prerender_suspect AND NOT f.is_geo_bot_suspect AND f.added_to_cart
    )::int,
    COUNT(*) FILTER (
      WHERE f.is_clean AND NOT f.is_prerender_suspect AND NOT f.is_geo_bot_suspect AND f.reached_checkout
    )::int,
    COUNT(*) FILTER (
      WHERE f.is_clean AND NOT f.is_prerender_suspect AND NOT f.is_geo_bot_suspect AND f.purchased
    )::int,
    COALESCE(SUM(f.purchase_value_sek) FILTER (
      WHERE f.is_clean AND NOT f.is_prerender_suspect AND NOT f.is_geo_bot_suspect AND f.purchased
    ), 0),
    COUNT(*) FILTER (WHERE f.is_prerender_suspect)::int,
    now()
  FROM analytics_session_facts f
  WHERE f.day_sthlm >= DATE '2026-08-07'
    AND (
      v_full
      OR f.day_sthlm IN (
        SELECT DISTINCT day_sthlm FROM analytics_session_facts
        WHERE refreshed_at >= now() - interval '1 minute'
           OR started_at >= v_cutoff
      )
    )
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

  -- Product daily: full days + list_sessions from product_list_viewed metadata
  IF v_full THEN
    DELETE FROM analytics_product_daily WHERE day_sthlm >= DATE '2026-08-07';
  ELSE
    DELETE FROM analytics_product_daily
    WHERE day_sthlm IN (
      SELECT DISTINCT day_sthlm FROM analytics_session_facts
      WHERE refreshed_at >= now() - interval '1 minute'
         OR started_at >= v_cutoff
    );
  END IF;

  WITH days AS (
    SELECT DISTINCT day_sthlm
    FROM analytics_session_facts
    WHERE day_sthlm >= DATE '2026-08-07'
      AND (
        v_full
        OR refreshed_at >= now() - interval '1 minute'
        OR started_at >= v_cutoff
      )
  ),
  clean_facts AS (
    SELECT f.*
    FROM analytics_session_facts f
    JOIN days d ON d.day_sthlm = f.day_sthlm
    WHERE f.is_clean
      AND NOT f.is_prerender_suspect
      AND NOT COALESCE(f.is_geo_bot_suspect, false)
  ),
  from_views AS (
    SELECT
      f.day_sthlm,
      COALESCE(f.site, 'other') AS site,
      pid AS product_id,
      COUNT(*) FILTER (WHERE f.reached_pdp)::int AS pdp_sessions,
      COUNT(*) FILTER (WHERE f.added_to_cart AND pid = ANY (f.product_ids_added))::int AS cart_sessions,
      COUNT(*) FILTER (WHERE f.reached_checkout)::int AS checkout_sessions,
      COUNT(*) FILTER (WHERE f.purchased)::int AS purchase_sessions
    FROM clean_facts f
    CROSS JOIN LATERAL unnest(f.product_ids_viewed) AS pid
    WHERE pid IS NOT NULL AND btrim(pid) <> ''
    GROUP BY 1, 2, 3
  ),
  from_list AS (
    SELECT
      f.day_sthlm,
      COALESCE(f.site, 'other') AS site,
      pid AS product_id,
      COUNT(DISTINCT f.session_id)::int AS list_sessions
    FROM clean_facts f
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
    GROUP BY 1, 2, 3
  )
  INSERT INTO analytics_product_daily (
    day_sthlm, site, product_id, product_name,
    list_sessions, pdp_sessions, cart_sessions, checkout_sessions, purchase_sessions, refreshed_at
  )
  SELECT
    COALESCE(v.day_sthlm, l.day_sthlm),
    COALESCE(v.site, l.site),
    COALESCE(v.product_id, l.product_id),
    NULL,
    COALESCE(l.list_sessions, 0),
    COALESCE(v.pdp_sessions, 0),
    COALESCE(v.cart_sessions, 0),
    COALESCE(v.checkout_sessions, 0),
    COALESCE(v.purchase_sessions, 0),
    now()
  FROM from_views v
  FULL OUTER JOIN from_list l
    ON l.day_sthlm = v.day_sthlm
   AND l.site = v.site
   AND l.product_id = v.product_id
  ON CONFLICT (day_sthlm, site, product_id) DO UPDATE SET
    list_sessions = EXCLUDED.list_sessions,
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

REVOKE ALL ON FUNCTION analytics_refresh_session_facts(timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION analytics_refresh_session_facts(timestamptz) TO service_role;

COMMENT ON FUNCTION analytics_refresh_session_facts(timestamptz) IS
  'Saga B1–B5 refresh: v2 channel/site, first country, geo inside refresh, full-day rollup, clean≈sessions_clean.';

-- ===========================================================================
-- Update geo applicator (302) to Saga rule — still callable from cron
-- ===========================================================================

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
  OR EXISTS (
    SELECT 1 FROM analytics_geo_bot_discarded_sessions d
    WHERE d.session_id = f.session_id
  );

  GET DIAGNOSTICS v_flagged = ROW_COUNT;

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
  'Saga geo-bot applicator (also folded into analytics_refresh_session_facts). Soft flag only.';

-- Keep 302 file in sync for readers of the migration chain (same body).
-- (302 itself is not re-run; this CREATE OR REPLACE is the live definition.)

-- ===========================================================================
-- B4 — RLS on V2 analytics tables
-- ===========================================================================

REVOKE ALL ON TABLE analytics_session_facts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE analytics_daily_rollup FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE analytics_product_daily FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE analytics_geo_bot_discarded_sessions FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF to_regclass('public.analytics_invited_friend_profiles') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON TABLE analytics_invited_friend_profiles FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT SELECT ON analytics_invited_friend_profiles TO service_role';
  END IF;
END $$;

ALTER TABLE analytics_session_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily_rollup ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_product_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_geo_bot_discarded_sessions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON analytics_session_facts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON analytics_daily_rollup TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON analytics_product_daily TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON analytics_geo_bot_discarded_sessions TO service_role;

-- Admin read via is_admin() if present, else is_platform_admin(), else service_role only.
DO $$
DECLARE
  admin_pred text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_admin'
      AND pg_get_function_identity_arguments(p.oid) = ''
  ) THEN
    admin_pred := 'public.is_admin()';
  ELSIF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_platform_admin'
      AND pg_get_function_identity_arguments(p.oid) = ''
  ) THEN
    admin_pred := 'public.is_platform_admin()';
  ELSE
    admin_pred := NULL;
  END IF;

  -- Drop prior policies if re-applied
  EXECUTE 'DROP POLICY IF EXISTS "Admins can select analytics_session_facts" ON analytics_session_facts';
  EXECUTE 'DROP POLICY IF EXISTS "Admins can select analytics_daily_rollup" ON analytics_daily_rollup';
  EXECUTE 'DROP POLICY IF EXISTS "Admins can select analytics_product_daily" ON analytics_product_daily';
  EXECUTE 'DROP POLICY IF EXISTS "Admins can select analytics_geo_bot_discarded_sessions" ON analytics_geo_bot_discarded_sessions';

  IF admin_pred IS NOT NULL THEN
    EXECUTE format(
      'CREATE POLICY "Admins can select analytics_session_facts" ON analytics_session_facts FOR SELECT USING (%s)',
      admin_pred
    );
    EXECUTE format(
      'CREATE POLICY "Admins can select analytics_daily_rollup" ON analytics_daily_rollup FOR SELECT USING (%s)',
      admin_pred
    );
    EXECUTE format(
      'CREATE POLICY "Admins can select analytics_product_daily" ON analytics_product_daily FOR SELECT USING (%s)',
      admin_pred
    );
    EXECUTE format(
      'CREATE POLICY "Admins can select analytics_geo_bot_discarded_sessions" ON analytics_geo_bot_discarded_sessions FOR SELECT USING (%s)',
      admin_pred
    );
    GRANT SELECT ON analytics_session_facts TO authenticated;
    GRANT SELECT ON analytics_daily_rollup TO authenticated;
    GRANT SELECT ON analytics_product_daily TO authenticated;
    GRANT SELECT ON analytics_geo_bot_discarded_sessions TO authenticated;
  END IF;
END $$;

-- ===========================================================================
-- B6 — Aggregate RPCs (SECURITY DEFINER, service_role execute)
-- ===========================================================================

CREATE OR REPLACE FUNCTION analytics_v2_rpc_rollup_totals(
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
  SELECT jsonb_build_object(
    'sessions', COALESCE(SUM(r.sessions), 0),
    'engaged', COALESCE(SUM(r.engaged), 0),
    'plp', COALESCE(SUM(r.plp), 0),
    'pdp', COALESCE(SUM(r.pdp), 0),
    'cart', COALESCE(SUM(r.cart), 0),
    'checkout', COALESCE(SUM(r.checkout), 0),
    'purchases', COALESCE(SUM(r.purchases), 0),
    'purchase_value_sek', COALESCE(SUM(r.purchase_value_sek), 0),
    'prerender_suspect', COALESCE(SUM(r.prerender_suspect), 0)
  )
  INTO v
  FROM analytics_daily_rollup r
  WHERE r.site = p_site
    AND r.day_sthlm >= p_from
    AND r.day_sthlm <= p_to
    AND (p_market IS NULL OR p_market = '' OR p_market = 'all' OR r.market = p_market)
    AND (p_channel IS NULL OR p_channel = '' OR r.channel = p_channel)
    AND (p_device IS NULL OR p_device = '' OR r.device = p_device)
    AND (
      p_invited IS NULL OR p_invited = '' OR p_invited = 'all' OR p_invited = 'include'
      OR (p_invited = 'exclude' AND r.is_invited_friend IS NOT TRUE)
    );
  RETURN COALESCE(v, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION analytics_v2_rpc_group_by(
  p_dim text,
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
  IF p_dim NOT IN ('channel', 'market') THEN
    RAISE EXCEPTION 'p_dim must be channel or market';
  END IF;

  IF p_dim = 'channel' THEN
    SELECT COALESCE(jsonb_agg(row_obj ORDER BY (row_obj->>'sessions')::int DESC), '[]'::jsonb)
    INTO v
    FROM (
      SELECT jsonb_build_object(
        'key', COALESCE(r.channel, 'direct'),
        'channel', COALESCE(r.channel, 'direct'),
        'sessions', SUM(r.sessions),
        'engaged', SUM(r.engaged),
        'plp', SUM(r.plp),
        'pdp', SUM(r.pdp),
        'cart', SUM(r.cart),
        'checkout', SUM(r.checkout),
        'purchases', SUM(r.purchases),
        'purchase_value_sek', SUM(r.purchase_value_sek)
      ) AS row_obj
      FROM analytics_daily_rollup r
      WHERE r.site = p_site
        AND r.day_sthlm >= p_from
        AND r.day_sthlm <= p_to
        AND (p_market IS NULL OR p_market = '' OR p_market = 'all' OR r.market = p_market)
        AND (p_channel IS NULL OR p_channel = '' OR r.channel = p_channel)
        AND (p_device IS NULL OR p_device = '' OR r.device = p_device)
        AND (
          p_invited IS NULL OR p_invited = '' OR p_invited = 'all' OR p_invited = 'include'
          OR (p_invited = 'exclude' AND r.is_invited_friend IS NOT TRUE)
        )
      GROUP BY COALESCE(r.channel, 'direct')
    ) s;
  ELSE
    SELECT COALESCE(jsonb_agg(row_obj ORDER BY (row_obj->>'sessions')::int DESC), '[]'::jsonb)
    INTO v
    FROM (
      SELECT jsonb_build_object(
        'key', COALESCE(r.market, 'unknown'),
        'market', COALESCE(r.market, 'unknown'),
        'sessions', SUM(r.sessions),
        'engaged', SUM(r.engaged),
        'plp', SUM(r.plp),
        'pdp', SUM(r.pdp),
        'cart', SUM(r.cart),
        'checkout', SUM(r.checkout),
        'purchases', SUM(r.purchases),
        'purchase_value_sek', SUM(r.purchase_value_sek)
      ) AS row_obj
      FROM analytics_daily_rollup r
      WHERE r.site = p_site
        AND r.day_sthlm >= p_from
        AND r.day_sthlm <= p_to
        AND (p_market IS NULL OR p_market = '' OR p_market = 'all' OR r.market = p_market)
        AND (p_channel IS NULL OR p_channel = '' OR r.channel = p_channel)
        AND (p_device IS NULL OR p_device = '' OR r.device = p_device)
        AND (
          p_invited IS NULL OR p_invited = '' OR p_invited = 'all' OR p_invited = 'include'
          OR (p_invited = 'exclude' AND r.is_invited_friend IS NOT TRUE)
        )
      GROUP BY COALESCE(r.market, 'unknown')
    ) s;
  END IF;

  RETURN COALESCE(v, '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION analytics_v2_rpc_checkout_steps(
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
  -- Distinct clean sessions per checkout step (ANY step viewed, not last-only).
  WITH facts AS (
    SELECT f.session_id, f.checkout_steps_seen
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
  steps_from_array AS (
    SELECT f.session_id, step
    FROM facts f
    CROSS JOIN LATERAL unnest(COALESCE(f.checkout_steps_seen, '{}'::text[])) AS step
    WHERE step IS NOT NULL
  ),
  steps_from_events AS (
    SELECT DISTINCT ue.session_id, analytics_checkout_step(ue.event_metadata) AS step
    FROM facts f
    JOIN user_events ue ON ue.session_id = f.session_id
    WHERE ue.event_type = 'checkout_step_viewed'
      AND analytics_checkout_step(ue.event_metadata) IS NOT NULL
      AND (
        f.checkout_steps_seen IS NULL
        OR cardinality(f.checkout_steps_seen) = 0
      )
  ),
  all_steps AS (
    SELECT * FROM steps_from_array
    UNION
    SELECT * FROM steps_from_events
  )
  SELECT COALESCE(
    jsonb_object_agg(step, cnt),
    '{}'::jsonb
  )
  INTO v
  FROM (
    SELECT step, COUNT(DISTINCT session_id)::int AS cnt
    FROM all_steps
    GROUP BY step
  ) s;

  RETURN jsonb_build_object(
    'postal', COALESCE((v->>'postal')::int, 0),
    'delivery', COALESCE((v->>'delivery')::int, 0),
    'age_terms', COALESCE((v->>'age_terms')::int, 0),
    'payment', COALESCE((v->>'payment')::int, 0)
  );
END;
$$;

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
  -- 6 steps WITHOUT engaged as required prior:
  -- sessions → plp → pdp → cart → checkout → purchase (time-ordered when timestamps exist).
  WITH facts AS (
    SELECT f.session_id, f.purchased, f.reached_plp, f.reached_pdp, f.added_to_cart, f.reached_checkout
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
  firsts AS (
    SELECT
      f.session_id,
      f.purchased,
      MIN(ue.created_at) FILTER (
        WHERE ue.event_type IN ('product_list_viewed', 'collection_viewed')
      ) AS t_plp,
      MIN(ue.created_at) FILTER (
        WHERE ue.event_type = 'product_viewed'
          AND (
            COALESCE(
              NULLIF(ue.event_metadata->>'productId', ''),
              NULLIF(ue.event_metadata->>'product_id', ''),
              NULLIF(ue.event_metadata->>'productHandle', ''),
              NULLIF(ue.event_metadata->>'handle', '')
            ) IS NOT NULL
            OR analytics_landing_type(analytics_path_from_url(ue.page_url)) = 'pdp'
          )
      ) AS t_pdp,
      MIN(ue.created_at) FILTER (WHERE ue.event_type = 'add_to_cart') AS t_cart,
      MIN(ue.created_at) FILTER (
        WHERE ue.event_type IN ('checkout_started', 'checkout_step_viewed')
      ) AS t_checkout,
      MIN(ue.created_at) FILTER (
        WHERE ue.event_type = 'reservation_completed'
      ) AS t_purchase
    FROM facts f
    LEFT JOIN user_events ue ON ue.session_id = f.session_id
    GROUP BY f.session_id, f.purchased
  ),
  scored AS (
    SELECT
      session_id,
      true AS s_sessions,
      (t_plp IS NOT NULL) AS s_plp,
      (t_plp IS NOT NULL AND t_pdp IS NOT NULL AND t_pdp >= t_plp) AS s_pdp,
      (
        t_plp IS NOT NULL AND t_pdp IS NOT NULL AND t_cart IS NOT NULL
        AND t_pdp >= t_plp AND t_cart >= t_pdp
      ) AS s_cart,
      (
        t_plp IS NOT NULL AND t_pdp IS NOT NULL AND t_cart IS NOT NULL AND t_checkout IS NOT NULL
        AND t_pdp >= t_plp AND t_cart >= t_pdp AND t_checkout >= t_cart
      ) AS s_checkout,
      (
        t_plp IS NOT NULL AND t_pdp IS NOT NULL AND t_cart IS NOT NULL AND t_checkout IS NOT NULL
        AND (t_purchase IS NOT NULL OR purchased)
        AND t_pdp >= t_plp AND t_cart >= t_pdp AND t_checkout >= t_cart
        AND (t_purchase IS NULL OR t_purchase >= t_checkout)
      ) AS s_purchase
    FROM firsts
  )
  SELECT jsonb_build_object(
    'sessions', COUNT(*)::int,
    'plp', COUNT(*) FILTER (WHERE s_plp)::int,
    'pdp', COUNT(*) FILTER (WHERE s_pdp)::int,
    'cart', COUNT(*) FILTER (WHERE s_cart)::int,
    'checkout', COUNT(*) FILTER (WHERE s_checkout)::int,
    'purchases', COUNT(*) FILTER (WHERE s_purchase)::int,
    'mode', 'closed_time_ordered',
    'steps', jsonb_build_array('sessions', 'plp', 'pdp', 'cart', 'checkout', 'purchase')
  )
  INTO v
  FROM scored;

  RETURN COALESCE(v, jsonb_build_object(
    'sessions', 0, 'plp', 0, 'pdp', 0, 'cart', 0, 'checkout', 0, 'purchases', 0
  ));
END;
$$;

REVOKE ALL ON FUNCTION analytics_v2_rpc_rollup_totals(text, date, date, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION analytics_v2_rpc_group_by(text, text, date, date, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION analytics_v2_rpc_checkout_steps(text, date, date, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION analytics_v2_rpc_closed_funnel(text, date, date, text, text, text, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION analytics_v2_rpc_rollup_totals(text, date, date, text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION analytics_v2_rpc_group_by(text, text, date, date, text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION analytics_v2_rpc_checkout_steps(text, date, date, text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION analytics_v2_rpc_closed_funnel(text, date, date, text, text, text, text) TO service_role;

COMMENT ON FUNCTION analytics_v2_rpc_rollup_totals(text, date, date, text, text, text, text) IS
  'B6: single jsonb of rollup sums (avoids 1000-row PostgREST truncate).';
COMMENT ON FUNCTION analytics_v2_rpc_group_by(text, text, date, date, text, text, text, text) IS
  'B6: jsonb array of channel|market aggregates.';
COMMENT ON FUNCTION analytics_v2_rpc_checkout_steps(text, date, date, text, text, text, text) IS
  'B6: distinct clean sessions per checkout step (any step, not last-only).';
COMMENT ON FUNCTION analytics_v2_rpc_closed_funnel(text, date, date, text, text, text, text) IS
  'B6: closed funnel without Engaged; time-ordered 6 steps.';
