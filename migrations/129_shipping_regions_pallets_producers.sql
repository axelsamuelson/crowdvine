-- Migration 129: Shipping regions (Phase 2.1 data model)
-- Geographic groupings for pallet automation; optional FKs on producers/pallets.

CREATE TABLE IF NOT EXISTS shipping_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country_code CHAR(2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipping_regions_country_code
  ON shipping_regions(country_code);

COMMENT ON TABLE shipping_regions IS
  'Geographic groupings of producers that can ship on the same pallet. One pallet is created per (shipping_region, delivery_zone) combination.';

-- Producers: region membership + pallet-handling flag (pickup_zone_id unchanged)
ALTER TABLE producers
  ADD COLUMN IF NOT EXISTS shipping_region_id UUID
    REFERENCES shipping_regions(id) ON DELETE SET NULL;

ALTER TABLE producers
  ADD COLUMN IF NOT EXISTS is_pallet_zone BOOLEAN
    NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_producers_shipping_region_id
  ON producers(shipping_region_id)
  WHERE shipping_region_id IS NOT NULL;

COMMENT ON COLUMN producers.shipping_region_id IS
  'Which shipping region this producer belongs to. Determines which pallet their wines go on.';

COMMENT ON COLUMN producers.is_pallet_zone IS
  'When true, this producer can physically handle a full pallet. The producer with the most bottles on a pallet becomes the current pickup point.';

-- Pallets: optional shipping region + dynamic pickup producer (pickup_zone_id unchanged)
ALTER TABLE pallets
  ADD COLUMN IF NOT EXISTS shipping_region_id UUID
    REFERENCES shipping_regions(id) ON DELETE SET NULL;

ALTER TABLE pallets
  ADD COLUMN IF NOT EXISTS current_pickup_producer_id UUID
    REFERENCES producers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pallets_shipping_region_id
  ON pallets(shipping_region_id)
  WHERE shipping_region_id IS NOT NULL;

COMMENT ON COLUMN pallets.shipping_region_id IS
  'The shipping region this pallet belongs to. New pallets use this instead of pickup_zone_id.';

COMMENT ON COLUMN pallets.current_pickup_producer_id IS
  'The producer with the most bottles on this pallet. This is the current planned pickup point. Updated dynamically as orders are placed or cancelled. Locked when shipping is ordered.';
