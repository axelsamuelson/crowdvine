-- One active (accepting) pallet per shipping route:
-- extend uniq_pallets_open_shipping_region_delivery from status=open only
-- to open | consolidating | complete.
--
-- Pre-check: fail clearly if duplicates already exist so the index create
-- does not surface a vague unique-violation mid-migration.

DO $$
DECLARE
  dup_count integer := 0;
  dup_detail text := '';
BEGIN
  SELECT COUNT(*)::integer, COALESCE(
    string_agg(
      format(
        '%s / %s (%s pallets: %s)',
        shipping_region_id,
        delivery_zone_id,
        n,
        ids
      ),
      '; '
      ORDER BY n DESC
    ),
    ''
  )
  INTO dup_count, dup_detail
  FROM (
    SELECT
      shipping_region_id,
      delivery_zone_id,
      COUNT(*)::integer AS n,
      string_agg(id::text, ', ' ORDER BY created_at) AS ids
    FROM pallets
    WHERE status IN ('open', 'consolidating', 'complete')
      AND shipping_region_id IS NOT NULL
      AND delivery_zone_id IS NOT NULL
    GROUP BY shipping_region_id, delivery_zone_id
    HAVING COUNT(*) > 1
  ) d;

  IF dup_count > 0 THEN
    RAISE EXCEPTION
      'migration 249_pallet_one_active_per_route aborted: % duplicate route(s) have more than one open/consolidating/complete pallet. Resolve before re-running. Details: %',
      dup_count,
      dup_detail;
  END IF;
END $$;

DROP INDEX IF EXISTS uniq_pallets_open_shipping_region_delivery;

CREATE UNIQUE INDEX uniq_pallets_open_shipping_region_delivery
  ON pallets (shipping_region_id, delivery_zone_id)
  WHERE status IN ('open', 'consolidating', 'complete')
    AND shipping_region_id IS NOT NULL
    AND delivery_zone_id IS NOT NULL;

COMMENT ON INDEX uniq_pallets_open_shipping_region_delivery IS
  'At most one accepting pallet (open/consolidating/complete) per (shipping_region, delivery_zone).';
