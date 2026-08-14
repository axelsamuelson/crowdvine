-- Migration 195: Shadow pallet contribution economics snapshots (Phase 2).
-- Does NOT change min_bottles_to_complete / live 120-bottle readiness.
-- Date: 2026-08-14

-- Line-level frozen economics at the moment a reservation starts counting toward pallet fill.
ALTER TABLE order_reservation_items
ADD COLUMN IF NOT EXISTS economics_snapshot JSONB;

ALTER TABLE order_reservation_items
ADD COLUMN IF NOT EXISTS pre_pallet_contribution_cents INTEGER;

COMMENT ON COLUMN order_reservation_items.economics_snapshot IS
  'Phase 2: frozen per-unit/line economics (öre SEK) at reservation item create. Used for shadow contribution readiness; does not control live completion.';

COMMENT ON COLUMN order_reservation_items.pre_pallet_contribution_cents IS
  'Phase 2: line total pre-pallet contribution in öre (quantity × unit). Null = not snapshotted (legacy rows).';

CREATE INDEX IF NOT EXISTS idx_order_reservation_items_pre_pallet_contribution
  ON order_reservation_items (reservation_id)
  WHERE pre_pallet_contribution_cents IS NOT NULL;

-- Optional freight target override; NULL means use pallets.cost_cents.
ALTER TABLE pallets
ADD COLUMN IF NOT EXISTS freight_target_cents INTEGER;

COMMENT ON COLUMN pallets.freight_target_cents IS
  'Optional inbound freight target in öre for shadow economic readiness. NULL → use cost_cents.';
