-- Shared-pallet close flow columns + choice tokens.
-- See docs/checkout/pallet-close-flow.md.
-- Axel approved applying on 2026-11-10 (test first, then prod by Hugo).

-- ---------------------------------------------------------------------------
-- order_reservations: close / choice / off-session pay-window audit fields
-- ---------------------------------------------------------------------------

ALTER TABLE order_reservations
  ADD COLUMN IF NOT EXISTS charge_deadline_at TIMESTAMPTZ;

COMMENT ON COLUMN order_reservations.charge_deadline_at IS
  'Shared-pallet open/charge deadline shown at confirm (created_at+28d, bumped once on wait extension).';

ALTER TABLE order_reservations
  ADD COLUMN IF NOT EXISTS pallet_close_state TEXT;

ALTER TABLE order_reservations
  DROP CONSTRAINT IF EXISTS order_reservations_pallet_close_state_check;

ALTER TABLE order_reservations
  ADD CONSTRAINT order_reservations_pallet_close_state_check
  CHECK (
    pallet_close_state IS NULL
    OR pallet_close_state IN (
      'open',
      'choice_pending',
      'extended',
      'charging',
      'closed_charged',
      'pay_link_pending',
      'closed_cancelled'
    )
  );

COMMENT ON COLUMN order_reservations.pallet_close_state IS
  'Close-flow state machine for shared-pallet charge-at-close.';

ALTER TABLE order_reservations
  ADD COLUMN IF NOT EXISTS pallet_close_choice TEXT;

ALTER TABLE order_reservations
  DROP CONSTRAINT IF EXISTS order_reservations_pallet_close_choice_check;

ALTER TABLE order_reservations
  ADD CONSTRAINT order_reservations_pallet_close_choice_check
  CHECK (
    pallet_close_choice IS NULL
    OR pallet_close_choice IN ('wait', 'cancel', 'switch_direct')
  );

ALTER TABLE order_reservations
  ADD COLUMN IF NOT EXISTS pallet_close_choice_at TIMESTAMPTZ;

ALTER TABLE order_reservations
  ADD COLUMN IF NOT EXISTS pallet_close_choice_sent_at TIMESTAMPTZ;

ALTER TABLE order_reservations
  ADD COLUMN IF NOT EXISTS pallet_close_choice_reply_by TIMESTAMPTZ;

ALTER TABLE order_reservations
  ADD COLUMN IF NOT EXISTS pallet_close_extension_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE order_reservations
  ADD COLUMN IF NOT EXISTS offsession_charge_failed_at TIMESTAMPTZ;

ALTER TABLE order_reservations
  ADD COLUMN IF NOT EXISTS offsession_pay_by TIMESTAMPTZ;

ALTER TABLE order_reservations
  ADD COLUMN IF NOT EXISTS offsession_payment_link_url TEXT;

ALTER TABLE order_reservations
  ADD COLUMN IF NOT EXISTS payment_method_detached_at TIMESTAMPTZ;

ALTER TABLE order_reservations
  ADD COLUMN IF NOT EXISTS pallet_close_charge_idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_order_reservations_close_charge_idem
  ON order_reservations (pallet_close_charge_idempotency_key)
  WHERE pallet_close_charge_idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_reservations_pallet_close_state
  ON order_reservations (pallet_close_state)
  WHERE pallet_close_state IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_reservations_charge_deadline
  ON order_reservations (charge_deadline_at)
  WHERE charge_deadline_at IS NOT NULL
    AND cancelled_at IS NULL
    AND payment_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_order_reservations_choice_reply_by
  ON order_reservations (pallet_close_choice_reply_by)
  WHERE pallet_close_state = 'choice_pending';

CREATE INDEX IF NOT EXISTS idx_order_reservations_offsession_pay_by
  ON order_reservations (offsession_pay_by)
  WHERE pallet_close_state = 'pay_link_pending';

-- ---------------------------------------------------------------------------
-- Single-use signed action tokens (wait / cancel / switch_direct)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pallet_close_action_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES order_reservations(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('wait', 'cancel', 'switch_direct')),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pallet_close_action_tokens_reservation
  ON pallet_close_action_tokens (reservation_id);

COMMENT ON TABLE pallet_close_action_tokens IS
  'Opaque single-use tokens for pallet-close choice email links.';

-- ---------------------------------------------------------------------------
-- Audit events (no PII)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pallet_close_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES order_reservations(id) ON DELETE CASCADE,
  pallet_id UUID,
  event TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pallet_close_events_reservation
  ON pallet_close_events (reservation_id, created_at DESC);

COMMENT ON TABLE pallet_close_events IS
  'Append-only close-flow audit (codes/booleans only — no PII).';

ALTER TABLE public.pallet_close_action_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pallet_close_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pallet_close_action_tokens FROM anon, authenticated;
REVOKE ALL ON public.pallet_close_events FROM anon, authenticated;
GRANT ALL ON public.pallet_close_action_tokens TO service_role;
GRANT ALL ON public.pallet_close_events TO service_role;
