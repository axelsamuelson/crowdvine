ALTER TABLE order_reservations
  ADD COLUMN IF NOT EXISTS retry_scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

COMMENT ON COLUMN order_reservations.retry_scheduled_at IS
  'When the next payment retry is scheduled.';

COMMENT ON COLUMN order_reservations.cancelled_at IS
  'When this reservation was cancelled due to payment failure.';

COMMENT ON COLUMN order_reservations.cancellation_reason IS
  'Why this reservation was cancelled.';
