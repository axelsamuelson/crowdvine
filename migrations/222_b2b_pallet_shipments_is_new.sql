-- Dirty Wine: mark a pallet as "New" so its wines show a NEW badge on dirtywine.se
ALTER TABLE b2b_pallet_shipments
  ADD COLUMN IF NOT EXISTS is_new BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN b2b_pallet_shipments.is_new IS
  'When true, wines on this pallet show a NEW badge on dirtywine.se (PDP and shop).';
