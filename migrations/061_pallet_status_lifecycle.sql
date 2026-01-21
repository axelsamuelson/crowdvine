-- Migration 061: Expand pallet.status lifecycle for pickup + delivery tracking
-- Date: 2026-01-21
--
-- Adds additional allowed values so we can track:
-- open -> consolidating -> complete -> awaiting_pickup -> picked_up -> in_transit -> out_for_delivery -> delivered
-- (and cancelled)

-- Drop old constraint if it exists (name from migration 049)
ALTER TABLE pallets
DROP CONSTRAINT IF EXISTS chk_pallet_status;

-- Re-add with expanded lifecycle values (lowercase)
ALTER TABLE pallets
ADD CONSTRAINT chk_pallet_status
CHECK (
  status IN (
    'open',
    'consolidating',
    'complete',
    'awaiting_pickup',
    'picked_up',
    'in_transit',
    'out_for_delivery',
    'shipped',
    'delivered',
    'cancelled'
  )
);

