-- Migration 194: Separate physical pallet capacity from ship-ready threshold.
-- bottle_capacity remains physical/logistics capacity (default 720).
-- min_bottles_to_complete is the operational "eligible to ship" threshold (default 120).
-- Date: 2026-08-14

ALTER TABLE pallets
ADD COLUMN IF NOT EXISTS min_bottles_to_complete INTEGER;

COMMENT ON COLUMN pallets.min_bottles_to_complete IS
  'Minimum reserved bottles before the pallet is eligible/ready to ship. Distinct from bottle_capacity (physical capacity used for freight amortization).';

-- Backfill existing rows; do not reopen historical/shipped pallets.
UPDATE pallets
SET min_bottles_to_complete = 120
WHERE min_bottles_to_complete IS NULL;

ALTER TABLE pallets
ALTER COLUMN min_bottles_to_complete SET DEFAULT 120;

ALTER TABLE pallets
ALTER COLUMN min_bottles_to_complete SET NOT NULL;

ALTER TABLE pallets
DROP CONSTRAINT IF EXISTS pallets_min_bottles_to_complete_positive;

ALTER TABLE pallets
ADD CONSTRAINT pallets_min_bottles_to_complete_positive
CHECK (min_bottles_to_complete > 0);
