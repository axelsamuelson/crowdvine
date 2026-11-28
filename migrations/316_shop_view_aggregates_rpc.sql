-- Migration 316: Aggregate shop PLP/PDP view stats in SQL (no 5k-row scan on render).
-- Apply to TEST (msdfjrrokcmjifetuwgc) first. Do NOT run against prod from agents.
--
-- Replaces client-side aggregation in lib/analytics/producer-ctr.ts and
-- lib/analytics/product-view-stats.ts that scanned user_events (limit 5000)
-- on every cache miss and caused statement timeouts under concurrent ISR.

CREATE INDEX IF NOT EXISTS idx_user_events_event_type_created_at
  ON public.user_events (event_type, created_at DESC);

-- Producer CTR: impressions from product_list_viewed.producerIds,
-- clicks from product_viewed.producerId. Excludes admin_metrics_excluded_profiles.
CREATE OR REPLACE FUNCTION public.analytics_producer_ctr_aggregates(
  p_lookback_days integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH filtered AS (
    SELECT e.event_type, e.event_metadata
    FROM public.user_events e
    WHERE e.event_type IN ('product_list_viewed', 'product_viewed')
      AND e.created_at >= (now() - make_interval(days => GREATEST(COALESCE(p_lookback_days, 30), 1)))
      AND (
        e.user_id IS NULL
        OR NOT EXISTS (
          SELECT 1
          FROM public.admin_metrics_excluded_profiles ex
          WHERE ex.profile_id = e.user_id
        )
      )
  ),
  clicks AS (
    SELECT
      trim(both FROM e.event_metadata->>'producerId') AS producer_id,
      count(*)::integer AS clicks
    FROM filtered e
    WHERE e.event_type = 'product_viewed'
      AND jsonb_typeof(e.event_metadata->'producerId') = 'string'
      AND length(trim(both FROM e.event_metadata->>'producerId')) > 0
    GROUP BY 1
  ),
  impressions AS (
    SELECT
      trim(both FROM elem.value #>> '{}') AS producer_id,
      count(*)::integer AS impressions
    FROM filtered e
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(e.event_metadata->'producerIds') = 'array'
          THEN e.event_metadata->'producerIds'
        ELSE '[]'::jsonb
      END
    ) AS elem(value)
    WHERE e.event_type = 'product_list_viewed'
      AND jsonb_typeof(elem.value) = 'string'
      AND length(trim(both FROM elem.value #>> '{}')) > 0
    GROUP BY 1
  ),
  ids AS (
    SELECT producer_id FROM clicks
    UNION
    SELECT producer_id FROM impressions
  )
  SELECT COALESCE(
    jsonb_object_agg(
      i.producer_id,
      jsonb_build_object(
        'impressions', COALESCE(im.impressions, 0),
        'clicks', COALESCE(c.clicks, 0),
        'ctr', CASE
          WHEN COALESCE(im.impressions, 0) > 0
            THEN COALESCE(c.clicks, 0)::double precision / im.impressions::double precision
          ELSE 0::double precision
        END
      )
    ),
    '{}'::jsonb
  )
  FROM ids i
  LEFT JOIN clicks c ON c.producer_id = i.producer_id
  LEFT JOIN impressions im ON im.producer_id = i.producer_id;
$$;

COMMENT ON FUNCTION public.analytics_producer_ctr_aggregates(integer) IS
  'Producer list impressions + PDP clicks for shop header popularity (last N days). service_role only.';

-- Per-wine PLP/PDP view counts for popular sort on the B2C shop.
CREATE OR REPLACE FUNCTION public.analytics_product_view_aggregates(
  p_lookback_days integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH filtered AS (
    SELECT e.event_type, e.event_metadata
    FROM public.user_events e
    WHERE e.event_type IN ('product_list_viewed', 'product_viewed')
      AND e.created_at >= (now() - make_interval(days => GREATEST(COALESCE(p_lookback_days, 30), 1)))
  ),
  pdp AS (
    SELECT
      trim(both FROM e.event_metadata->>'productId') AS product_id,
      count(*)::integer AS pdp_views
    FROM filtered e
    WHERE e.event_type = 'product_viewed'
      AND jsonb_typeof(e.event_metadata->'productId') = 'string'
      AND length(trim(both FROM e.event_metadata->>'productId')) > 0
    GROUP BY 1
  ),
  plp AS (
    SELECT
      trim(both FROM elem.value #>> '{}') AS product_id,
      count(*)::integer AS plp_views
    FROM filtered e
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(e.event_metadata->'productIds') = 'array'
          THEN e.event_metadata->'productIds'
        ELSE '[]'::jsonb
      END
    ) AS elem(value)
    WHERE e.event_type = 'product_list_viewed'
      AND jsonb_typeof(elem.value) = 'string'
      AND length(trim(both FROM elem.value #>> '{}')) > 0
    GROUP BY 1
  ),
  ids AS (
    SELECT product_id FROM pdp
    UNION
    SELECT product_id FROM plp
  )
  SELECT COALESCE(
    jsonb_object_agg(
      i.product_id,
      jsonb_build_object(
        'plpViews', COALESCE(pl.plp_views, 0),
        'pdpViews', COALESCE(pd.pdp_views, 0),
        'conversionRate', CASE
          WHEN COALESCE(pl.plp_views, 0) > 0
            THEN COALESCE(pd.pdp_views, 0)::double precision / pl.plp_views::double precision
          ELSE 0::double precision
        END
      )
    ),
    '{}'::jsonb
  )
  FROM ids i
  LEFT JOIN pdp pd ON pd.product_id = i.product_id
  LEFT JOIN plp pl ON pl.product_id = i.product_id;
$$;

COMMENT ON FUNCTION public.analytics_product_view_aggregates(integer) IS
  'Per-wine PLP/PDP view aggregates for shop popularity sort (last N days). service_role only.';

REVOKE ALL ON FUNCTION public.analytics_producer_ctr_aggregates(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.analytics_product_view_aggregates(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.analytics_producer_ctr_aggregates(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.analytics_product_view_aggregates(integer) TO service_role;
