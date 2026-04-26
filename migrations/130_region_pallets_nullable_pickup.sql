-- Phase 2.2: Region-based pallets may omit pickup_zone_id; reservation denormalization.

-- Allow region-only pallets (pickup filled in Phase 2.3 / legacy zone pallets keep pickup_zone_id)
ALTER TABLE pallets
  ALTER COLUMN pickup_zone_id DROP NOT NULL;

ALTER TABLE pallets
  DROP CONSTRAINT IF EXISTS pallets_different_zones;

ALTER TABLE pallets
  ADD CONSTRAINT pallets_different_zones
  CHECK (
    pickup_zone_id IS NULL
    OR delivery_zone_id IS DISTINCT FROM pickup_zone_id
  );

-- At most one open pallet per (shipping_region, delivery) for automation idempotency
CREATE UNIQUE INDEX IF NOT EXISTS uniq_pallets_open_shipping_region_delivery
  ON pallets (shipping_region_id, delivery_zone_id)
  WHERE status = 'open'
    AND shipping_region_id IS NOT NULL
    AND delivery_zone_id IS NOT NULL;

-- Denormalized region on reservation for cleanup after terminal statuses (Phase 2.2)
ALTER TABLE order_reservations
  ADD COLUMN IF NOT EXISTS shipping_region_id UUID
    REFERENCES shipping_regions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_order_reservations_shipping_region_id
  ON order_reservations(shipping_region_id)
  WHERE shipping_region_id IS NOT NULL;
