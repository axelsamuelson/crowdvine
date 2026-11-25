-- Per-customer shared-pallet charge deadline.
-- Deadline is the purchase (created_at + 28 days), not the pallet's created_at.
-- A date never charges the card. Charge happens only when the pallet is full.

UPDATE order_reservations
SET charge_deadline_at = created_at + interval '28 days'
WHERE payment_mode = 'setup_intent'
  AND cancelled_at IS NULL
  AND status <> 'archived'
  AND charge_deadline_at IS NULL;
