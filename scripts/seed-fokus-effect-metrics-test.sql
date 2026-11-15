-- TEST-only (msdfjrrokcmjifetuwgc): bootstrap analytics_sessions_clean + synthetic
-- Fokus effect events for weeks 41–46 / 2026. Never run against prod.
-- Idempotent: deletes prior fokus-fx-* rows before insert.

CREATE OR REPLACE VIEW public.analytics_sessions_clean AS
SELECT ue.*
FROM public.user_events ue
WHERE
  (ue.user_agent IS NULL OR ue.user_agent !~* 'bot|crawl|spider|headless|lighthouse|slurp')
  AND (ue.session_id IS NULL OR ue.session_id NOT LIKE 'server\_%')
  AND (ue.referrer IS NULL OR ue.referrer NOT ILIKE '%localhost%')
  AND COALESCE(ue.event_metadata->>'internal', '') IS DISTINCT FROM 'true';

COMMENT ON VIEW public.analytics_sessions_clean IS
  'TEST bootstrap: user_events minus bots/server/localhost/internal. Prod uses the fuller migration view.';

REVOKE ALL ON public.analytics_sessions_clean FROM anon;
REVOKE ALL ON public.analytics_sessions_clean FROM authenticated;
GRANT SELECT ON public.analytics_sessions_clean TO service_role;

DELETE FROM user_events WHERE session_id LIKE 'fokus-fx-%';

WITH weeks(week, mid) AS (
  VALUES
    (41, timestamptz '2026-10-07 12:00:00+00'),
    (42, timestamptz '2026-10-14 12:00:00+00'),
    (43, timestamptz '2026-10-21 12:00:00+00'),
    (44, timestamptz '2026-10-28 12:00:00+00'),
    (45, timestamptz '2026-11-04 12:00:00+00'),
    (46, timestamptz '2026-11-11 12:00:00+00')
),
plp_counts(week, n) AS (
  VALUES (41,3),(42,5),(43,4),(44,6),(45,8),(46,7)
),
plp AS (
  SELECT w.week, w.mid, g.i
  FROM weeks w
  JOIN plp_counts c ON c.week = w.week
  CROSS JOIN LATERAL generate_series(1, c.n) AS g(i)
),
-- Small-sample baseline (sum started = 9 < 30). Large-sample boost is a
-- separate INSERT at the bottom (fokus-fx-co-big-*) for ≥30 started checkouts.
checkout(week, started, completed) AS (
  VALUES
    (41,0,0),
    (42,2,0),
    (43,3,1),
    (44,1,1),
    (45,1,0),
    (46,2,1)
),
co_started AS (
  SELECT w.week, w.mid, g.i
  FROM weeks w
  JOIN checkout c ON c.week = w.week
  CROSS JOIN LATERAL generate_series(1, c.started) AS g(i)
),
co_done AS (
  SELECT w.week, w.mid, g.i
  FROM weeks w
  JOIN checkout c ON c.week = w.week
  CROSS JOIN LATERAL generate_series(1, c.completed) AS g(i)
)
INSERT INTO user_events (
  session_id, event_type, event_name, event_category, site, page_url,
  created_at, visitor_id, user_agent, event_metadata
)
SELECT
  'fokus-fx-plp-w' || week || '-' || i,
  CASE WHEN i % 3 = 1 THEN 'product_list_viewed'
       WHEN i % 3 = 2 THEN 'collection_viewed'
       ELSE 'product_viewed' END,
  CASE WHEN i % 3 = 1 THEN 'product_list_viewed'
       WHEN i % 3 = 2 THEN 'collection_viewed'
       ELSE 'product_viewed' END,
  'engagement',
  'pact',
  'https://pactwines.com/vin',
  mid + (i || ' minutes')::interval,
  'fokus-fx-visitor-plp-w' || week || '-' || i,
  'Mozilla/5.0 FokusFxTest',
  jsonb_build_object('synthetic', true, 'fokus_effect', true)
FROM plp
UNION ALL
SELECT
  'fokus-fx-co-w' || week || '-' || i,
  'checkout_started',
  'checkout_started',
  'checkout',
  'pact',
  'https://pactwines.com/checkout',
  mid + ((10 + i) || ' minutes')::interval,
  'fokus-fx-visitor-co-w' || week || '-' || i,
  'Mozilla/5.0 FokusFxTest',
  jsonb_build_object('synthetic', true, 'fokus_effect', true)
FROM co_started
UNION ALL
SELECT
  'fokus-fx-co-w' || week || '-' || i,
  'reservation_completed',
  'reservation_completed',
  'conversion',
  'pact',
  'https://pactwines.com/checkout/success',
  mid + ((30 + i) || ' minutes')::interval,
  'fokus-fx-visitor-co-w' || week || '-' || i,
  'Mozilla/5.0 FokusFxTest',
  jsonb_build_object('synthetic', true, 'fokus_effect', true)
FROM co_done;

-- Sunday 23:30 Stockholm → still ISO week 46
INSERT INTO user_events (
  session_id, event_type, event_name, event_category, site, page_url,
  created_at, visitor_id, user_agent, event_metadata
) VALUES (
  'fokus-fx-plp-w46-sunday',
  'product_viewed',
  'product_viewed',
  'engagement',
  'pact',
  'https://pactwines.com/vin/x',
  timestamptz '2026-11-15 22:30:00+00',
  'fokus-fx-visitor-plp-w46-sunday',
  'Mozilla/5.0 FokusFxTest',
  jsonb_build_object('synthetic', true, 'fokus_effect', true)
);

-- Large-sample case for SELECTED week 46: 120 started / 34 completed
-- → "28 % slutförda · 34 av 120 kassor" (trend claim allowed for that week).
-- Seed WITHOUT these rows when demonstrating "För lite data för trend".
-- Session ids: fokus-fx-co-big-*
--
-- DELETE FROM user_events WHERE session_id LIKE 'fokus-fx-co-big-%';
-- Then (TEST only):
-- WITH series AS (SELECT generate_series(1, 120) AS i)
-- INSERT INTO user_events (...)
--   checkout_started for all i at 2026-11-11 …
--   reservation_completed for i <= 34 …

