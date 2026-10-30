-- Persistent visitor identity for analytics (distinct from session_id).
-- DROP + CREATE required: CREATE OR REPLACE cannot insert visitor_id before site.

ALTER TABLE user_events
  ADD COLUMN IF NOT EXISTS visitor_id text;

COMMENT ON COLUMN user_events.visitor_id IS
  'Stable browser visitor UUID from localStorage (pact_visitor_id). Distinct from session_id.';

CREATE INDEX IF NOT EXISTS idx_user_events_visitor_id
  ON user_events (visitor_id);

DROP VIEW IF EXISTS analytics_intent_sessions;
DROP VIEW IF EXISTS analytics_sessions_clean;

CREATE VIEW analytics_sessions_clean AS
WITH base AS (
  SELECT ue.*
  FROM user_events ue
  WHERE
    (
      ue.user_id IS NULL
      OR ue.user_id NOT IN (
        SELECT e.profile_id FROM admin_metrics_excluded_profiles e
      )
    )
    AND (
      ue.user_agent IS NULL
      OR ue.user_agent !~* 'bot|crawl|spider|headless|lighthouse|slurp'
    )
    AND ue.session_id NOT LIKE 'server\_%'
    AND (
      ue.referrer IS NULL
      OR ue.referrer NOT ILIKE '%localhost%'
    )
    AND ue.session_id NOT IN (
      SELECT DISTINCT e.session_id
      FROM user_events e
      WHERE e.event_metadata->>'internal' = 'true'
        AND e.session_id IS NOT NULL
    )
),
site_counts AS (
  SELECT
    b.session_id,
    analytics_site(b.page_url) AS site,
    COUNT(*)::int AS n
  FROM base b
  WHERE analytics_site(b.page_url) IS NOT NULL
  GROUP BY b.session_id, analytics_site(b.page_url)
),
dominant_site AS (
  SELECT DISTINCT ON (session_id)
    session_id,
    site
  FROM site_counts
  ORDER BY session_id, n DESC, site ASC
)
SELECT
  b.*,
  d.site
FROM base b
INNER JOIN dominant_site d ON d.session_id = b.session_id;

COMMENT ON VIEW analytics_sessions_clean IS
  'user_events excluding internal profiles, bots, server_ sessions, localhost referrers, internal-tagged sessions, and sessions with no pact/dirtywine page_url. Includes visitor_id and session-level site.';

CREATE VIEW analytics_intent_sessions AS
WITH clean_events AS (
  SELECT c.*
  FROM analytics_sessions_clean c
  WHERE COALESCE(c.event_metadata->>'productId', '') <> 'test'
),
session_base AS (
  SELECT
    ce.session_id,
    (
      ARRAY_AGG(ce.site ORDER BY ce.created_at DESC)
        FILTER (WHERE ce.site IS NOT NULL)
    )[1] AS site,
    (
      ARRAY_AGG(ce.user_id ORDER BY ce.created_at DESC)
        FILTER (WHERE ce.user_id IS NOT NULL)
    )[1] AS user_id,
    MIN(ce.created_at) FILTER (
      WHERE ce.event_type IN (
        'add_to_cart',
        'remove_from_cart',
        'checkout_started',
        'checkout_step_viewed',
        'checkout_abandoned'
      )
    ) AS started_at,
    MAX(ce.created_at) AS last_seen_at,
    BOOL_OR(ce.event_type = 'reservation_completed') AS has_reservation_event,
    BOOL_OR(
      ce.event_type IN (
        'checkout_started',
        'checkout_step_viewed',
        'checkout_abandoned'
      )
    ) AS reached_checkout,
    BOOL_OR(ce.event_type = 'add_to_cart') AS has_add_to_cart,
    (
      ARRAY_AGG(ce.event_metadata->>'phase' ORDER BY ce.created_at DESC)
        FILTER (
          WHERE ce.event_type = 'checkout_step_viewed'
            AND ce.event_metadata->>'phase' IS NOT NULL
        )
    )[1] AS last_checkout_phase,
    (
      ARRAY_AGG(ce.event_metadata->>'phase' ORDER BY ce.created_at DESC)
        FILTER (
          WHERE ce.event_type = 'checkout_abandoned'
            AND ce.event_metadata->>'phase' IS NOT NULL
        )
    )[1] AS abandoned_phase,
    BOOL_OR(ce.event_type = 'checkout_abandoned') AS has_abandoned
  FROM clean_events ce
  GROUP BY ce.session_id
),
eligible AS (
  SELECT sb.*
  FROM session_base sb
  WHERE sb.started_at IS NOT NULL
    AND (sb.has_add_to_cart OR sb.reached_checkout)
    AND NOT sb.has_reservation_event
    AND NOT EXISTS (
      SELECT 1
      FROM order_reservations orr
      WHERE sb.user_id IS NOT NULL
        AND orr.user_id = sb.user_id
        AND orr.created_at >= sb.started_at
        AND orr.created_at < sb.started_at + INTERVAL '7 days'
    )
),
cart_lines AS (
  SELECT
    ce.session_id,
    COALESCE(
      NULLIF(ce.event_metadata->>'productId', ''),
      NULLIF(ce.event_metadata->>'merchandiseId', '')
    ) AS product_id,
    MAX(ce.event_metadata->>'productName')
      FILTER (WHERE ce.event_type = 'add_to_cart') AS product_name,
    MAX(
      CASE
        WHEN ce.event_type = 'add_to_cart'
          THEN COALESCE((ce.event_metadata->>'price')::numeric, 0)
        ELSE NULL
      END
    ) AS price,
    SUM(
      CASE
        WHEN ce.event_type = 'add_to_cart' THEN
          COALESCE((ce.event_metadata->>'quantity')::numeric, 1)
        WHEN ce.event_type = 'remove_from_cart' THEN
          -COALESCE(
            (ce.event_metadata->>'quantity')::numeric,
            999999
          )
        ELSE 0
      END
    ) AS quantity
  FROM clean_events ce
  INNER JOIN eligible e ON e.session_id = ce.session_id
  WHERE ce.event_type IN ('add_to_cart', 'remove_from_cart')
    AND COALESCE(
      NULLIF(ce.event_metadata->>'productId', ''),
      NULLIF(ce.event_metadata->>'merchandiseId', '')
    ) IS NOT NULL
  GROUP BY
    ce.session_id,
    COALESCE(
      NULLIF(ce.event_metadata->>'productId', ''),
      NULLIF(ce.event_metadata->>'merchandiseId', '')
    )
),
wines_agg AS (
  SELECT
    session_id,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'productId', product_id,
          'productName', COALESCE(product_name, product_id),
          'quantity', quantity,
          'price', COALESCE(price, 0)
        )
        ORDER BY product_name NULLS LAST, product_id
      ) FILTER (WHERE quantity > 0),
      '[]'::jsonb
    ) AS wines,
    COALESCE(
      SUM(GREATEST(quantity, 0) * COALESCE(price, 0))
        FILTER (WHERE quantity > 0),
      0
    ) AS cart_value
  FROM cart_lines
  GROUP BY session_id
)
SELECT
  e.session_id,
  e.site,
  e.user_id,
  e.started_at,
  e.last_seen_at,
  COALESCE(w.wines, '[]'::jsonb) AS wines,
  COALESCE(w.cart_value, 0)::numeric AS cart_value,
  e.reached_checkout,
  e.last_checkout_phase,
  e.abandoned_phase,
  CASE
    WHEN e.has_abandoned THEN
      'abandoned:' || COALESCE(e.abandoned_phase, e.last_checkout_phase, 'unknown')
    WHEN e.reached_checkout THEN
      'checkout:' || COALESCE(e.last_checkout_phase, 'started')
    ELSE
      'add_to_cart'
  END AS last_step
FROM eligible e
LEFT JOIN wines_agg w ON w.session_id = e.session_id;

COMMENT ON VIEW analytics_intent_sessions IS
  'Clean sessions with add_to_cart/checkout that did not convert. Includes site (pact|dirtywine). Used by admin Nära köp.';
