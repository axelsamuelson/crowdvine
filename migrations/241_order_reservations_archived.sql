-- Soft-archive for order_reservations: keep rows in DB but exclude from active order paths.
-- No CHECK/enum exists on order_reservations.status today; 'archived' is a new status value.
-- status_before_archive preserves the prior lifecycle status for unarchive.

ALTER TABLE order_reservations
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archive_reason TEXT,
  ADD COLUMN IF NOT EXISTS status_before_archive TEXT;

COMMENT ON COLUMN order_reservations.archived_at IS
  'When this reservation was soft-archived. Non-null means status should be archived.';

COMMENT ON COLUMN order_reservations.archive_reason IS
  'Why this reservation was archived (admin note / code). No customer email is sent on archive.';

COMMENT ON COLUMN order_reservations.status_before_archive IS
  'Lifecycle status before archive; restored on unarchive.';

CREATE INDEX IF NOT EXISTS idx_order_reservations_archived_at
  ON order_reservations (archived_at)
  WHERE archived_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_reservations_status_archived
  ON order_reservations (status)
  WHERE status = 'archived';
