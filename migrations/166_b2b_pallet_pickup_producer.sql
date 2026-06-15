-- Manual pickup location for B2B pallet shipments (Dirty Wine)

ALTER TABLE b2b_pallet_shipments
  ADD COLUMN IF NOT EXISTS pickup_producer_id UUID REFERENCES producers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_b2b_pallet_shipments_pickup_producer
  ON b2b_pallet_shipments(pickup_producer_id);

COMMENT ON COLUMN b2b_pallet_shipments.pickup_producer_id IS
  'Optional manual pickup location producer. When null, pickup is derived from pallet contents (20% pallet-zone rule).';
