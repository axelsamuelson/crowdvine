-- Add pallet cost (transport, shipping etc) to b2b_pallet_shipments

ALTER TABLE b2b_pallet_shipments
ADD COLUMN IF NOT EXISTS cost_cents INTEGER;

COMMENT ON COLUMN b2b_pallet_shipments.cost_cents IS 'Pallet cost ex VAT in öre (transport, shipping, etc).';
