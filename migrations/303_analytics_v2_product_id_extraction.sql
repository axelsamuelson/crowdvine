-- Analytics V2: extract product ids from productId/product_id/productHandle/path.
-- Fixes empty analytics_product_daily when product_viewed lacks productId
-- (e.g. synthetic fokus-fx sessions on /vin). Soft update only; no DELETE.

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

-- Backfill product_ids_viewed / product_ids_added on existing facts
UPDATE analytics_session_facts f
SET
  product_ids_viewed = COALESCE(sub.viewed, '{}'::text[]),
  product_ids_added = COALESCE(sub.added, '{}'::text[])
FROM (
  SELECT
    ue.session_id,
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

-- Rebuild product_daily for window (from facts arrays)
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
