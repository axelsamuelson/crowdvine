-- B2B pallet sellable flag: only active pallets count toward B2B stock on dirtywine.se
ALTER TABLE b2b_pallet_shipments
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT false;

-- Existing pallets were already treated as sellable stock
UPDATE b2b_pallet_shipments SET is_active = true WHERE is_active = false;

COMMENT ON COLUMN b2b_pallet_shipments.is_active IS
  'When true, wine on this pallet counts toward B2B sellable stock. New pallets default to false until activated.';
