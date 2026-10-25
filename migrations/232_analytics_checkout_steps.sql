-- Checkout steps: last_step uses postal | delivery | age_terms | payment.
-- Abandonment is the last checkout_step_viewed without a matching checkout_step_completed.
-- last_checkout_error is the latest checkout_error code. Raw user_events are unchanged.

CREATE OR REPLACE FUNCTION analytics_checkout_step(meta jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN meta->>'step' IN ('postal', 'delivery', 'age_terms', 'payment') THEN meta->>'step'
    WHEN meta->>'step' = '1' THEN 'postal'
    WHEN meta->>'step' = '2' THEN 'delivery'
    WHEN meta->>'step' = '3' THEN 'age_terms'
    WHEN meta->>'step' = '4' THEN 'payment'
    WHEN meta->>'phase' = 'compliance' THEN 'age_terms'
    WHEN meta->>'phase' IN ('payment', 'payment_ready') THEN 'payment'
    WHEN meta->>'phase' = 'delivery' THEN 'delivery'
    ELSE NULL
  END;
$$;

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
        'checkout_step_completed',
        'checkout_error',
        'checkout_abandoned'
      )
    ) AS started_at,
    MAX(ce.created_at) AS last_seen_at,
    BOOL_OR(ce.event_type = 'reservation_completed') AS has_reservation_event,
    BOOL_OR(
      ce.event_type IN (
        'checkout_started',
        'checkout_step_viewed',
        'checkout_step_completed',
        'checkout_error',
        'checkout_abandoned'
      )
    ) AS reached_checkout,
    BOOL_OR(ce.event_type = 'add_to_cart') AS has_add_to_cart,
    (
      ARRAY_AGG(
        analytics_checkout_step(ce.event_metadata)
        ORDER BY ce.created_at DESC
      ) FILTER (
        WHERE ce.event_type = 'checkout_step_viewed'
          AND COALESCE(ce.event_metadata->>'step', ce.event_metadata->>'phase') IS NOT NULL
      )
    )[1] AS last_viewed_step,
    COALESCE(
      ARRAY_AGG(
        analytics_checkout_step(ce.event_metadata)
      ) FILTER (
        WHERE ce.event_type = 'checkout_step_completed'
          AND COALESCE(ce.event_metadata->>'step', ce.event_metadata->>'phase') IS NOT NULL
      ),
      ARRAY[]::text[]
    ) AS completed_steps,
    (
      ARRAY_AGG(
        analytics_checkout_step(ce.event_metadata)
        ORDER BY ce.created_at DESC
      ) FILTER (
        WHERE ce.event_type IN ('checkout_step_viewed', 'checkout_step_completed')
          AND COALESCE(ce.event_metadata->>'step', ce.event_metadata->>'phase') IS NOT NULL
      )
    )[1] AS last_checkout_phase,
    (
      ARRAY_AGG(
        analytics_checkout_step(ce.event_metadata)
        ORDER BY ce.created_at DESC
      ) FILTER (
        WHERE ce.event_type = 'checkout_abandoned'
          AND COALESCE(ce.event_metadata->>'step', ce.event_metadata->>'phase') IS NOT NULL
      )
    )[1] AS abandoned_phase,
    (
      ARRAY_AGG(ce.event_metadata->>'code' ORDER BY ce.created_at DESC)
        FILTER (
          WHERE ce.event_type = 'checkout_error'
            AND ce.event_metadata->>'code' IS NOT NULL
        )
    )[1] AS last_checkout_error,
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
    WHEN e.last_viewed_step IS NOT NULL
      AND NOT (e.last_viewed_step = ANY(COALESCE(e.completed_steps, ARRAY[]::text[])))
    THEN 'abandoned:' || e.last_viewed_step
    WHEN e.reached_checkout THEN
      'checkout:' || COALESCE(e.last_viewed_step, e.last_checkout_phase, 'started')
    WHEN e.abandoned_phase IS NOT NULL THEN
      'abandoned:' || e.abandoned_phase
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
  ) AS is_human,
  e.last_checkout_error
FROM eligible e
LEFT JOIN wines_agg w ON w.session_id = e.session_id;



COMMENT ON VIEW analytics_intent_sessions IS
  'Clean sessions with add_to_cart/checkout that did not convert. last_step uses postal, delivery, age_terms, payment. last_checkout_error is the latest checkout_error code. is_human uses the analytics_human_sessions rule.';
