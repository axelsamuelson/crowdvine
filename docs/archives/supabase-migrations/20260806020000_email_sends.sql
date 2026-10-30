-- Migration 185: Idempotent transactional email send log.
-- UNIQUE (email_type, reservation_id) guarantees at-most-once send per type/reservation.

CREATE TABLE IF NOT EXISTS email_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type text NOT NULL,
  recipient text NOT NULL,
  reservation_id uuid REFERENCES order_reservations(id),
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email_type, reservation_id)
);

COMMENT ON TABLE email_sends IS
  'Claim log for transactional emails. Insert before send; unique conflict = already sent.';

COMMENT ON COLUMN email_sends.email_type IS
  'Stable key e.g. order_confirmation, payment_confirmed, payment_failed, payment_ready.';

CREATE INDEX IF NOT EXISTS email_sends_reservation_id_idx
  ON email_sends (reservation_id)
  WHERE reservation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS email_sends_sent_at_idx
  ON email_sends (sent_at DESC);

ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;
-- Service role / admin client bypasses RLS; no anon/authenticated policies.
