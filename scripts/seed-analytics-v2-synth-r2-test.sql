-- TEST ONLY (msdfjrrokcmjifetuwgc). Synthetic analytics events for Saga R2 verification.
-- Idempotent via session_id / wine id prefixes. Never run against prod.
--
-- Required before this file:
--   SELECT set_config('pact.allow_test_analytics_seed', 'msdfjrrokcmjifetuwgc', true);
--   \i scripts/test-only/analytics-v2-test-stubs.sql   -- if TEST lacks exclusion tables

DO $$
BEGIN
  IF current_setting('pact.allow_test_analytics_seed', true)
       IS DISTINCT FROM 'msdfjrrokcmjifetuwgc' THEN
    RAISE EXCEPTION
      'Refusing synth seed outside TEST (msdfjrrokcmjifetuwgc). Run: SELECT set_config(''pact.allow_test_analytics_seed'', ''msdfjrrokcmjifetuwgc'', true); Never on prod.';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Synthetic wines (40) so day×wine can exceed 1000 in a 28-day window
-- ---------------------------------------------------------------------------
INSERT INTO wines (id, handle, wine_name, vintage, base_price_cents, producer_id, is_live, available_for_sale)
SELECT
  ('ffffffff-ffff-4fff-8fff-' || lpad(g::text, 12, '0'))::uuid,
  'synth-r2-wine-' || g,
  'Synth R2 Vin ' || g,
  '2024',
  10000 + g,
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid,
  false,
  false
FROM generate_series(1, 40) AS g
ON CONFLICT (id) DO UPDATE SET
  wine_name = EXCLUDED.wine_name,
  handle = EXCLUDED.handle;

-- Wipe prior synth events for this batch
DELETE FROM user_events WHERE session_id LIKE 'synth-r2-v6-%';
DELETE FROM analytics_session_facts WHERE session_id LIKE 'synth-r2-v6-%';
DELETE FROM analytics_geo_bot_discarded_sessions WHERE session_id LIKE 'synth-r2-v6-%';

-- ---------------------------------------------------------------------------
-- PDP grid: every day × every wine → 28×40 = 1120 day×wine cells after rebuild
-- Channels / markets / devices vary by day & wine index
-- ---------------------------------------------------------------------------
WITH
days AS (
  SELECT d::date AS day_sthlm
  FROM generate_series(date '2026-10-19', date '2026-11-15', interval '1 day') AS d
),
wines_s AS (
  SELECT
    id,
    handle,
    wine_name,
    row_number() OVER (ORDER BY id) AS n
  FROM wines
  WHERE handle LIKE 'synth-r2-wine-%'
),
grid AS (
  SELECT
    d.day_sthlm,
    w.id AS wine_id,
    w.handle,
    w.n,
    'synth-r2-v6-pdp-' || to_char(d.day_sthlm, 'YYYYMMDD') || '-' || w.n AS session_id,
    -- channel via referrer / utm
    CASE (w.n + extract(doy FROM d.day_sthlm)::int) % 4
      WHEN 0 THEN 'organic'
      WHEN 1 THEN 'direct'
      WHEN 2 THEN 'referral'
      ELSE 'social'
    END AS channel_kind,
    CASE (w.n + extract(doy FROM d.day_sthlm)::int) % 4
      WHEN 0 THEN 'SE'
      WHEN 1 THEN 'DE'
      WHEN 2 THEN 'FR'
      ELSE NULL
    END AS country_code,
    CASE (w.n) % 3
      WHEN 0 THEN 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'
      WHEN 1 THEN 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
      ELSE 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
    END AS user_agent
  FROM days d
  CROSS JOIN wines_s w
)
INSERT INTO user_events (
  id, session_id, event_type, event_category, event_name, event_metadata,
  page_url, referrer, user_agent, visitor_id, country_code, host, site, created_at
)
SELECT
  gen_random_uuid(),
  g.session_id,
  e.event_type,
  'synthetic',
  e.event_type,
  e.meta || jsonb_build_object(
    'synthetic', true,
    'synth_batch', 'r2-v6',
    'synth_note', 'TEST-only Saga R2 seed'
  ),
  e.page_url,
  e.referrer,
  g.user_agent,
  'synth-visitor-' || g.n,
  g.country_code,
  'pactwines.com',
  'pact',
  (g.day_sthlm::timestamp + e.offset_min * interval '1 minute')
    AT TIME ZONE 'Europe/Stockholm'
FROM grid g
CROSS JOIN LATERAL (
  VALUES
    -- page_view landing
    (
      'page_view'::text,
      jsonb_build_object(),
      'https://pactwines.com/vin',
      CASE g.channel_kind
        WHEN 'organic' THEN 'https://www.google.com/'
        WHEN 'direct' THEN NULL
        WHEN 'referral' THEN 'https://example-news.se/artikel'
        ELSE 'https://www.instagram.com/'
      END,
      0
    ),
    -- list view with product id
    (
      'product_list_viewed',
      jsonb_build_object('productIds', jsonb_build_array(g.wine_id::text)),
      'https://pactwines.com/vin',
      CASE g.channel_kind
        WHEN 'organic' THEN 'https://www.google.com/'
        WHEN 'direct' THEN NULL
        WHEN 'referral' THEN 'https://example-news.se/artikel'
        ELSE 'https://www.instagram.com/'
      END,
      1
    ),
    -- PDP
    (
      'product_viewed',
      jsonb_build_object(
        'productId', g.wine_id::text,
        'productHandle', g.handle
      ),
      'https://pactwines.com/produkt/' || g.handle,
      CASE g.channel_kind
        WHEN 'organic' THEN 'https://www.google.com/'
        WHEN 'direct' THEN NULL
        WHEN 'referral' THEN 'https://example-news.se/artikel'
        ELSE 'https://www.instagram.com/'
      END,
      2
    ),
    -- engagement so not geo
    (
      'session_engaged',
      jsonb_build_object(),
      'https://pactwines.com/produkt/' || g.handle,
      CASE g.channel_kind
        WHEN 'organic' THEN 'https://www.google.com/'
        WHEN 'direct' THEN NULL
        WHEN 'referral' THEN 'https://example-news.se/artikel'
        ELSE 'https://www.instagram.com/'
      END,
      3
    )
) AS e(event_type, meta, page_url, referrer, offset_min);

-- UTM first-touch for organic/social via extra metadata on first event is enough;
-- channel classifier uses referrer host. For organic also set utm on first page_view:
UPDATE user_events ue
SET event_metadata = ue.event_metadata || jsonb_build_object(
  'utm_source', 'google',
  'utm_medium', 'organic',
  'first_utm_source', 'google',
  'first_utm_medium', 'organic'
)
WHERE ue.session_id LIKE 'synth-r2-v6-pdp-%'
  AND ue.event_type = 'page_view'
  AND ue.referrer ILIKE '%google%';

UPDATE user_events ue
SET event_metadata = ue.event_metadata || jsonb_build_object(
  'utm_source', 'instagram',
  'utm_medium', 'social',
  'first_utm_source', 'instagram',
  'first_utm_medium', 'social'
)
WHERE ue.session_id LIKE 'synth-r2-v6-pdp-%'
  AND ue.event_type = 'page_view'
  AND ue.referrer ILIKE '%instagram%';

-- ---------------------------------------------------------------------------
-- Volume mix (Inès v7): wines 1–20 get a second PDP session/day → 56 (≥30 ok).
-- Wines 21–40 stay at 28 (under threshold → gray numbers + banner).
-- ---------------------------------------------------------------------------
WITH
days AS (
  SELECT d::date AS day_sthlm
  FROM generate_series(date '2026-10-19', date '2026-11-15', interval '1 day') AS d
),
wines_s AS (
  SELECT
    id,
    handle,
    wine_name,
    row_number() OVER (ORDER BY id) AS n
  FROM wines
  WHERE handle LIKE 'synth-r2-wine-%'
),
grid AS (
  SELECT
    d.day_sthlm,
    w.id AS wine_id,
    w.handle,
    w.n,
    'synth-r2-v6-pdpb-' || to_char(d.day_sthlm, 'YYYYMMDD') || '-' || w.n AS session_id,
    CASE (w.n + extract(doy FROM d.day_sthlm)::int) % 4
      WHEN 0 THEN 'organic'
      WHEN 1 THEN 'direct'
      WHEN 2 THEN 'referral'
      ELSE 'social'
    END AS channel_kind,
    CASE (w.n + extract(doy FROM d.day_sthlm)::int) % 4
      WHEN 0 THEN 'SE'
      WHEN 1 THEN 'DE'
      WHEN 2 THEN 'FR'
      ELSE NULL
    END AS country_code,
    CASE (w.n) % 3
      WHEN 0 THEN 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'
      WHEN 1 THEN 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
      ELSE 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
    END AS user_agent
  FROM days d
  CROSS JOIN wines_s w
  WHERE w.n <= 20
)
INSERT INTO user_events (
  id, session_id, event_type, event_category, event_name, event_metadata,
  page_url, referrer, user_agent, visitor_id, country_code, host, site, created_at
)
SELECT
  gen_random_uuid(),
  g.session_id,
  e.event_type,
  'synthetic',
  e.event_type,
  e.meta || jsonb_build_object(
    'synthetic', true,
    'synth_batch', 'r2-v7',
    'synth_note', 'TEST volume boost for mixed low-n UI'
  ),
  e.page_url,
  e.referrer,
  g.user_agent,
  'synth-visitor-b-' || g.n,
  g.country_code,
  'pactwines.com',
  'pact',
  (g.day_sthlm::timestamp + (e.offset_min + 30) * interval '1 minute')
    AT TIME ZONE 'Europe/Stockholm'
FROM grid g
CROSS JOIN LATERAL (
  VALUES
    (
      'page_view'::text,
      jsonb_build_object(),
      'https://pactwines.com/produkt/' || g.handle,
      CASE g.channel_kind
        WHEN 'organic' THEN 'https://www.google.com/'
        WHEN 'direct' THEN NULL
        WHEN 'referral' THEN 'https://example-news.se/artikel'
        ELSE 'https://www.instagram.com/'
      END,
      0
    ),
    (
      'product_viewed',
      jsonb_build_object(
        'product_id', g.wine_id::text,
        'productId', g.wine_id::text,
        'productHandle', g.handle
      ),
      'https://pactwines.com/produkt/' || g.handle,
      CASE g.channel_kind
        WHEN 'organic' THEN 'https://www.google.com/'
        WHEN 'direct' THEN NULL
        WHEN 'referral' THEN 'https://example-news.se/artikel'
        ELSE 'https://www.instagram.com/'
      END,
      1
    ),
    (
      'session_engaged',
      jsonb_build_object(),
      'https://pactwines.com/produkt/' || g.handle,
      CASE g.channel_kind
        WHEN 'organic' THEN 'https://www.google.com/'
        WHEN 'direct' THEN NULL
        WHEN 'referral' THEN 'https://example-news.se/artikel'
        ELSE 'https://www.instagram.com/'
      END,
      2
    )
) AS e(event_type, meta, page_url, referrer, offset_min);

-- ---------------------------------------------------------------------------
-- Geo suspects: CN/SG/HK, direct, 1 page_view, <10s, no engagement
-- ---------------------------------------------------------------------------
INSERT INTO user_events (
  id, session_id, event_type, event_category, event_name, event_metadata,
  page_url, referrer, user_agent, visitor_id, country_code, host, site, created_at
)
SELECT
  gen_random_uuid(),
  'synth-r2-v6-geo-' || c.country || '-' || g,
  'page_view',
  'synthetic',
  'page_view',
  jsonb_build_object(
    'synthetic', true,
    'synth_batch', 'r2-v6',
    'synth_note', 'geo-rule candidate'
  ),
  'https://pactwines.com/',
  NULL,
  'Mozilla/5.0 (compatible; synth-bot-check)',
  'synth-geo-visitor-' || c.country || '-' || g,
  c.country,
  'pactwines.com',
  'pact',
  (date '2026-11-01' + (g || ' hours')::interval) AT TIME ZONE 'Europe/Stockholm'
FROM (VALUES ('CN'), ('SG'), ('HK')) AS c(country)
CROSS JOIN generate_series(1, 12) AS g;

-- ---------------------------------------------------------------------------
-- Unflag edge case: session starts as geo, later gets engagement (after rebuild we add it)
-- First insert matching geo only; a second script step after first flag will add engagement.
-- ---------------------------------------------------------------------------
INSERT INTO user_events (
  id, session_id, event_type, event_category, event_name, event_metadata,
  page_url, referrer, user_agent, visitor_id, country_code, host, site, created_at
)
VALUES (
  gen_random_uuid(),
  'synth-r2-v6-geo-unflag-1',
  'page_view',
  'synthetic',
  'page_view',
  jsonb_build_object('synthetic', true, 'synth_batch', 'r2-v6', 'synth_note', 'unflag-before'),
  'https://pactwines.com/',
  NULL,
  'Mozilla/5.0 (compatible; synth-unflag)',
  'synth-geo-unflag-visitor',
  'CN',
  'pactwines.com',
  'pact',
  timestamptz '2026-11-05 10:00:00+01'
);

SELECT
  count(*) FILTER (WHERE session_id LIKE 'synth-r2-v6-pdp-%')::int AS pdp_events,
  count(*) FILTER (WHERE session_id LIKE 'synth-r2-v6-geo-%')::int AS geo_events,
  count(DISTINCT session_id) FILTER (WHERE session_id LIKE 'synth-r2-v6-%')::int AS synth_sessions
FROM user_events
WHERE session_id LIKE 'synth-r2-v6-%';
