-- Migration 062: Pallet status mode (auto vs manual)
-- Date: 2026-01-21
--
-- By default pallets are auto-driven. Manual status changes require explicitly switching to manual mode.

ALTER TABLE pallets
ADD COLUMN IF NOT EXISTS status_mode TEXT DEFAULT 'auto';

ALTER TABLE pallets
DROP CONSTRAINT IF EXISTS chk_pallet_status_mode;

ALTER TABLE pallets
ADD CONSTRAINT chk_pallet_status_mode
CHECK (status_mode IN ('auto', 'manual'));

UPDATE pallets
SET status_mode = COALESCE(status_mode, 'auto')
WHERE status_mode IS NULL;

