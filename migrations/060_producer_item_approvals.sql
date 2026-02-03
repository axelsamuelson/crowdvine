-- Migration 060: Producer item-level approvals (partial fulfillment)
-- Adds per-line approval metadata so producers can approve/decline each wine and adjust approved quantities.
-- Date: 2026-01-21

ALTER TABLE order_reservation_items
ADD COLUMN IF NOT EXISTS producer_decision_status TEXT;

ALTER TABLE order_reservation_items
ADD COLUMN IF NOT EXISTS producer_approved_quantity INTEGER;

ALTER TABLE order_reservation_items
ADD COLUMN IF NOT EXISTS producer_decided_at TIMESTAMPTZ;

ALTER TABLE order_reservation_items
ADD COLUMN IF NOT EXISTS producer_decided_by UUID;

COMMENT ON COLUMN order_reservation_items.producer_decision_status IS
'Producer decision for this line item: pending | approved | declined. Partial approval is represented by approved_quantity < quantity.';

COMMENT ON COLUMN order_reservation_items.producer_approved_quantity IS
'Quantity approved by producer for this line item (0..quantity). NULL means not decided yet.';

-- Best-effort backfill: existing items become pending with NULL approved quantity.
UPDATE order_reservation_items
SET producer_decision_status = COALESCE(producer_decision_status, 'pending')
WHERE producer_decision_status IS NULL;

