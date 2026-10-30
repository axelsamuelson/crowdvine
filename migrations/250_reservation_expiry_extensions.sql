-- Reservation expiry / extension (köpvillkor p. 3 automation):
-- 30-day ask, 7-day reply, unlimited extensions by default (optional max-age via env).
-- Soft-archive already exists (241); this adds extension ask state + single-use tokens + admin flag.

ALTER TABLE order_reservations
  ADD COLUMN IF NOT EXISTS extension_ask_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS extension_ask_milestone_day INTEGER,
  ADD COLUMN IF NOT EXISTS extension_reply_by TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS extensions_confirmed_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_extension_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expiry_admin_flag TEXT,
  ADD COLUMN IF NOT EXISTS expiry_admin_flagged_at TIMESTAMPTZ;

COMMENT ON COLUMN order_reservations.extension_ask_sent_at IS
  'When the latest 30-day extension ask email was sent.';
COMMENT ON COLUMN order_reservations.extension_ask_milestone_day IS
  'Milestone day (from created_at) for the open extension ask, e.g. 30 or 60.';
COMMENT ON COLUMN order_reservations.extension_reply_by IS
  'Deadline for the customer to confirm the open extension ask (ask_sent + reply window).';
COMMENT ON COLUMN order_reservations.extensions_confirmed_count IS
  'How many times the customer confirmed a +30 day extension. Hard cap remains max age (90).';
COMMENT ON COLUMN order_reservations.last_extension_confirmed_at IS
  'When the customer last confirmed an extension via the signed link.';
COMMENT ON COLUMN order_reservations.expiry_admin_flag IS
  'Admin attention code when auto-expiry cannot safely finish (e.g. already_charged). No PII.';
COMMENT ON COLUMN order_reservations.expiry_admin_flagged_at IS
  'When expiry_admin_flag was set.';

CREATE TABLE IF NOT EXISTS reservation_extension_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES order_reservations (id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reservation_extension_tokens_token_hash_key UNIQUE (token_hash)
);

COMMENT ON TABLE reservation_extension_tokens IS
  'Opaque single-use tokens for reservation extension confirmation links (no login).';

CREATE INDEX IF NOT EXISTS idx_reservation_extension_tokens_reservation
  ON reservation_extension_tokens (reservation_id);

CREATE INDEX IF NOT EXISTS idx_reservation_extension_tokens_open
  ON reservation_extension_tokens (reservation_id, expires_at)
  WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_order_reservations_extension_reply_by
  ON order_reservations (extension_reply_by)
  WHERE extension_reply_by IS NOT NULL AND archived_at IS NULL;

ALTER TABLE reservation_extension_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON reservation_extension_tokens FROM anon, authenticated;
