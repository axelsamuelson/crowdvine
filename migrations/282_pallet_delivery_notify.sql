-- DRAFT / NOT APPLIED — shared-pallet post-close delivery customer emails.
-- Shipped window / arrived Sweden / delay notice + late-delivery cancel audit.
-- Behind PALLET_CLOSE_FLOW_ENABLED (+ CHECKOUT_DUAL_OFFER_COMPARE).
-- Do NOT run from an agent against prod/staging.

-- ---------------------------------------------------------------------------
-- pallets: delivery notification fields (admin-entered)
-- ---------------------------------------------------------------------------

ALTER TABLE pallets
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

COMMENT ON COLUMN pallets.closed_at IS
  'When the shared pallet closed (charge/close). Used for 30-day late-delivery cancel clock.';

ALTER TABLE pallets
  ADD COLUMN IF NOT EXISTS delivery_window_start DATE;

ALTER TABLE pallets
  ADD COLUMN IF NOT EXISTS delivery_window_end DATE;

COMMENT ON COLUMN pallets.delivery_window_start IS
  'Admin-entered estimated delivery window start (customer email: Pallen har skickats).';
COMMENT ON COLUMN pallets.delivery_window_end IS
  'Admin-entered estimated delivery window end.';

ALTER TABLE pallets
  ADD COLUMN IF NOT EXISTS delivery_shipped_at TIMESTAMPTZ;

ALTER TABLE pallets
  ADD COLUMN IF NOT EXISTS delivery_shipped_notified_at TIMESTAMPTZ;

ALTER TABLE pallets
  ADD COLUMN IF NOT EXISTS arrived_sweden_at TIMESTAMPTZ;

ALTER TABLE pallets
  ADD COLUMN IF NOT EXISTS delivery_day DATE;

COMMENT ON COLUMN pallets.delivery_day IS
  'Admin-entered delivery day after wine reached Sweden (customer email: Leveransdag).';

ALTER TABLE pallets
  ADD COLUMN IF NOT EXISTS delivery_day_notified_at TIMESTAMPTZ;

ALTER TABLE pallets
  ADD COLUMN IF NOT EXISTS delivery_expected_date DATE;

COMMENT ON COLUMN pallets.delivery_expected_date IS
  'Current expected delivery date; updating triggers delay-notice email when flow enabled.';

ALTER TABLE pallets
  ADD COLUMN IF NOT EXISTS delivery_expected_updated_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- order_reservations: late-delivery cancel / refund audit
-- ---------------------------------------------------------------------------

ALTER TABLE order_reservations
  ADD COLUMN IF NOT EXISTS late_delivery_cancel_at TIMESTAMPTZ;

ALTER TABLE order_reservations
  ADD COLUMN IF NOT EXISTS late_delivery_refund_id TEXT;

ALTER TABLE order_reservations
  ADD COLUMN IF NOT EXISTS late_delivery_refund_promised_by TIMESTAMPTZ;

COMMENT ON COLUMN order_reservations.late_delivery_cancel_at IS
  'Customer cancelled for full refund after 30 days post-close without delivery.';
COMMENT ON COLUMN order_reservations.late_delivery_refund_id IS
  'Stripe refund id (or local marker) for late-delivery full refund.';
COMMENT ON COLUMN order_reservations.late_delivery_refund_promised_by IS
  'Refund promised within 14 days of late_delivery_cancel_at.';
