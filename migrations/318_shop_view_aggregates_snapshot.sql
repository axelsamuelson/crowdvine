-- Migration 318: Precompute shop view aggregates for fast RPC during SSG/ISR.
-- Apply to TEST (msdfjrrokcmjifetuwgc) first. Do NOT run against prod from agents.
--
-- PR332 moved aggregation into SQL RPCs that still scan user_events (~4s with
-- temp spill). Next.js SSG calls analytics_producer_ctr_aggregates from the
-- root layout header on hundreds of pages in parallel → statement timeouts
-- and 60s page export failures. Snapshot + 15-minute refresh keeps the same
-- RPC signatures while making each call a cheap jsonb read.

CREATE TABLE IF NOT EXISTS public.analytics_shop_view_snapshots (
  kind text PRIMARY KEY CHECK (kind IN ('producer_ctr', 'product_view')),
  lookback_days integer NOT NULL DEFAULT 30,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  refreshed_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.analytics_shop_view_snapshots IS
  'Precomputed shop popularity aggregates (producer CTR + per-wine PLP/PDP). Refreshed by analytics_refresh_shop_view_aggregates.';

CREATE OR REPLACE FUNCTION public.analytics_refresh_shop_view_aggregates(
  p_lookback_days integer DEFAULT 30
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days integer := GREATEST(COALESCE(p_lookback_days, 30), 1);
  v_producer jsonb;
  v_product jsonb;
BEGIN
  -- Same aggregation rules as migration 316 (string ids only; producer CTR
  -- excludes admin_metrics_excluded_profiles).
  WITH filtered AS (
    SELECT e.event_type, e.event_metadata
    FROM public.user_events e
    WHERE e.event_type IN ('product_list_viewed', 'product_viewed')
      AND e.created_at >= (now() - make_interval(days => v_days))
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
  INTO v_producer
  FROM ids i
  LEFT JOIN clicks c ON c.producer_id = i.producer_id
  LEFT JOIN impressions im ON im.producer_id = i.producer_id;

  WITH filtered AS (
    SELECT e.event_type, e.event_metadata
    FROM public.user_events e
    WHERE e.event_type IN ('product_list_viewed', 'product_viewed')
      AND e.created_at >= (now() - make_interval(days => v_days))
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
  INTO v_product
  FROM ids i
  LEFT JOIN pdp pd ON pd.product_id = i.product_id
  LEFT JOIN plp pl ON pl.product_id = i.product_id;

  INSERT INTO public.analytics_shop_view_snapshots (kind, lookback_days, payload, refreshed_at)
  VALUES
    ('producer_ctr', v_days, COALESCE(v_producer, '{}'::jsonb), now()),
    ('product_view', v_days, COALESCE(v_product, '{}'::jsonb), now())
  ON CONFLICT (kind) DO UPDATE
  SET
    lookback_days = EXCLUDED.lookback_days,
    payload = EXCLUDED.payload,
    refreshed_at = EXCLUDED.refreshed_at;
END;
$$;

COMMENT ON FUNCTION public.analytics_refresh_shop_view_aggregates(integer) IS
  'Rebuild producer CTR + product view JSON snapshots from user_events. service_role only.';

-- Keep existing RPC signatures; read precomputed payload (ignore lookback at
-- read time — snapshot is always the scheduled 30d window the shop uses).
CREATE OR REPLACE FUNCTION public.analytics_producer_ctr_aggregates(
  p_lookback_days integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT s.payload
     FROM public.analytics_shop_view_snapshots s
     WHERE s.kind = 'producer_ctr'),
    '{}'::jsonb
  );
$$;

CREATE OR REPLACE FUNCTION public.analytics_product_view_aggregates(
  p_lookback_days integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT s.payload
     FROM public.analytics_shop_view_snapshots s
     WHERE s.kind = 'product_view'),
    '{}'::jsonb
  );
$$;

-- Seed snapshots so RPC is cheap immediately after migrate.
SELECT public.analytics_refresh_shop_view_aggregates(30);

-- Schedule refresh every 15 minutes when pg_cron is available.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron not available: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Unschedule prior job if re-applied.
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'refresh-shop-view-aggregates';

    PERFORM cron.schedule(
      'refresh-shop-view-aggregates',
      '*/15 * * * *',
      $cron$SELECT public.analytics_refresh_shop_view_aggregates(30)$cron$
    );
  ELSE
    RAISE NOTICE 'Skipping cron.schedule; enable pg_cron or refresh via service_role.';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'cron.schedule failed: %', SQLERRM;
END $$;

REVOKE ALL ON FUNCTION public.analytics_refresh_shop_view_aggregates(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.analytics_producer_ctr_aggregates(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.analytics_product_view_aggregates(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.analytics_refresh_shop_view_aggregates(integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.analytics_producer_ctr_aggregates(integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.analytics_product_view_aggregates(integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_refresh_shop_view_aggregates(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.analytics_producer_ctr_aggregates(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.analytics_product_view_aggregates(integer) TO service_role;

ALTER TABLE public.analytics_shop_view_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.analytics_shop_view_snapshots FROM PUBLIC;
REVOKE ALL ON TABLE public.analytics_shop_view_snapshots FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.analytics_shop_view_snapshots TO service_role;
