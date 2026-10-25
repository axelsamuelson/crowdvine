-- Exclude every session whose visitor_id has ever been internal, and add a human-session view.
-- Raw user_events rows are unchanged. Country is not a filter.

CREATE OR REPLACE VIEW analytics_internal_visitor_ids AS
SELECT DISTINCT ue.visitor_id
FROM user_events ue
WHERE ue.visitor_id IS NOT NULL
  AND (
    ue.user_id IN (
      SELECT e.profile_id FROM admin_metrics_excluded_profiles e
    )
    OR ue.event_metadata->>'internal' = 'true'
  );

COMMENT ON VIEW analytics_internal_visitor_ids IS
  'visitor_id values that have ever appeared on an excluded profile or an event tagged internal.';

CREATE OR REPLACE VIEW analytics_sessions_clean AS
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
    AND (
      ue.visitor_id IS NULL
      OR NOT EXISTS (
        SELECT 1
        FROM analytics_internal_visitor_ids iv
        WHERE iv.visitor_id = ue.visitor_id
      )
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
),
-- Entry point = chronologically first event in the session
entry AS (
  SELECT DISTINCT ON (session_id)
    session_id,
    referrer,
    page_url,
    event_metadata
  FROM base
  ORDER BY session_id, created_at ASC
),
session_channel AS (
  SELECT
    e.session_id,
    analytics_channel(
      e.referrer,
      COALESCE(
        NULLIF(e.event_metadata->>'utm_source', ''),
        NULLIF(e.event_metadata->>'first_utm_source', ''),
        analytics_utm_param(e.page_url, 'utm_source')
      ),
      COALESCE(
        NULLIF(e.event_metadata->>'utm_medium', ''),
        NULLIF(e.event_metadata->>'first_utm_medium', ''),
        analytics_utm_param(e.page_url, 'utm_medium')
      )
    ) AS channel
  FROM entry e
)
SELECT
  b.*,
  d.site,
  sc.channel
FROM base b
INNER JOIN dominant_site d ON d.session_id = b.session_id
LEFT JOIN session_channel sc ON sc.session_id = b.session_id;

COMMENT ON VIEW analytics_sessions_clean IS
  'Clean user_events with visitor_id, country_code, session-level site, and channel from first event.';

CREATE OR REPLACE VIEW analytics_intent_sessions AS
WITH clean_events AS (
  SELECT c.*
  FROM analytics_sessions_clean c
  WHERE COALESCE(c.event_metadata->>'productId', '') <> 'test'
),
country_counts AS (
  SELECT
    ce.session_id,
    ce.country_code,
    COUNT(*)::int AS n
  FROM clean_events ce
  WHERE ce.country_code IS NOT NULL
  GROUP BY ce.session_id, ce.country_code
),
dominant_country AS (
  SELECT DISTINCT ON (session_id)
    session_id,
    country_code
  FROM country_counts
  ORDER BY session_id, n DESC, country_code ASC
),
session_base AS (
  SELECT
    ce.session_id,
    (
      ARRAY_AGG(ce.site ORDER BY ce.created_at DESC)
        FILTER (WHERE ce.site IS NOT NULL)
    )[1] AS site,
    dc.country_code,
    (
      ARRAY_AGG(ce.channel ORDER BY ce.created_at ASC)
        FILTER (WHERE ce.channel IS NOT NULL)
    )[1] AS channel,
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
  LEFT JOIN dominant_country dc ON dc.session_id = ce.session_id
  GROUP BY ce.session_id, dc.country_code
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
  e.country_code,
  e.channel,
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
  END AS last_step,
  EXISTS (
    SELECT 1
    FROM analytics_sessions_clean h
    WHERE h.session_id = e.session_id
    GROUP BY h.session_id
    HAVING
      BOOL_OR(h.event_type IN (
        'session_engaged',
        'add_to_cart',
        'cart_opened',
        'filter_used',
        'search_submitted'
      ))
      OR COUNT(*) FILTER (WHERE h.event_type = 'page_view') > 1
  ) AS is_human
FROM eligible e
LEFT JOIN wines_agg w ON w.session_id = e.session_id;


COMMENT ON VIEW analytics_intent_sessions IS
  'Clean sessions with add_to_cart/checkout that did not convert. is_human uses the analytics_human_sessions rule.';

CREATE OR REPLACE VIEW analytics_human_sessions AS
SELECT c.*
FROM analytics_sessions_clean c
WHERE c.session_id IN (
  SELECT h.session_id
  FROM analytics_sessions_clean h
  GROUP BY h.session_id
  HAVING
    BOOL_OR(h.event_type IN (
      'session_engaged',
      'add_to_cart',
      'cart_opened',
      'filter_used',
      'search_submitted'
    ))
    OR COUNT(*) FILTER (WHERE h.event_type = 'page_view') > 1
);

COMMENT ON VIEW analytics_human_sessions IS
  'analytics_sessions_clean events for sessions with a human signal: session_engaged, cart, filter, search, or more than one page_view.';

REVOKE ALL ON public.analytics_internal_visitor_ids FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.analytics_human_sessions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.analytics_internal_visitor_ids TO service_role;
GRANT SELECT ON public.analytics_human_sessions TO service_role;
