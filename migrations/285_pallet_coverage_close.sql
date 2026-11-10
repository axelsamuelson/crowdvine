-- Shared-pallet coverage close (Axel 2026-11-11 / Ingrid CFO).
-- File only — do NOT apply from an agent (TEST first, prod after owner yes).
--
-- Replaces live 720/270 bottle model for PACT shared pallets with:
--   bottle cap 600, coverage thresholds, scheduled Monday lock, heads-up email,
--   sold-out-at-lock customer choice (replace or remove).

-- ---------------------------------------------------------------------------
-- pallets: coverage-close schedule + first-order clock + lock audit
-- ---------------------------------------------------------------------------

ALTER TABLE pallets
  ADD COLUMN IF NOT EXISTS first_order_at TIMESTAMPTZ;

COMMENT ON COLUMN pallets.first_order_at IS
  'Timestamp of the pallet''s first active order — clock for coverage day thresholds.';

ALTER TABLE pallets
  ADD COLUMN IF NOT EXISTS coverage_lock_scheduled_at TIMESTAMPTZ;

COMMENT ON COLUMN pallets.coverage_lock_scheduled_at IS
  'When set, pallet is scheduled to lock (default next Monday). Cleared if re-check fails.';

ALTER TABLE pallets
  ADD COLUMN IF NOT EXISTS coverage_lock_heads_up_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN pallets.coverage_lock_heads_up_sent_at IS
  'When heads-up lock email was sent to customers on this pallet.';

ALTER TABLE pallets
  ADD COLUMN IF NOT EXISTS coverage_locked_at TIMESTAMPTZ;

COMMENT ON COLUMN pallets.coverage_locked_at IS
  'When the pallet locked under the coverage-close rule (charges may proceed).';

ALTER TABLE pallets
  ADD COLUMN IF NOT EXISTS coverage_close_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN pallets.coverage_close_enabled IS
  'Per-pallet opt-in to coverage-close model (600 cap / thresholds). Default false until cutover.';

CREATE INDEX IF NOT EXISTS idx_pallets_coverage_lock_scheduled
  ON pallets (coverage_lock_scheduled_at)
  WHERE coverage_lock_scheduled_at IS NOT NULL
    AND coverage_locked_at IS NULL;

-- ---------------------------------------------------------------------------
-- order_reservation_items: sold-out-at-lock choice state
-- ---------------------------------------------------------------------------

ALTER TABLE order_reservation_items
  ADD COLUMN IF NOT EXISTS sold_out_choice_state TEXT;

ALTER TABLE order_reservation_items
  DROP CONSTRAINT IF EXISTS order_reservation_items_sold_out_choice_state_check;

ALTER TABLE order_reservation_items
  ADD CONSTRAINT order_reservation_items_sold_out_choice_state_check
  CHECK (
    sold_out_choice_state IS NULL
    OR sold_out_choice_state IN (
      'ok',
      'pending_choice',
      'replaced',
      'removed'
    )
  );

COMMENT ON COLUMN order_reservation_items.sold_out_choice_state IS
  'Sold-out-at-lock line state. NULL = legacy/unaffected; pending_choice awaits customer.';

ALTER TABLE order_reservation_items
  ADD COLUMN IF NOT EXISTS sold_out_replacement_wine_id UUID;

COMMENT ON COLUMN order_reservation_items.sold_out_replacement_wine_id IS
  'Replacement wine chosen by customer when original was sold out at lock.';

ALTER TABLE order_reservation_items
  ADD COLUMN IF NOT EXISTS sold_out_replacement_amount_ore INTEGER;

COMMENT ON COLUMN order_reservation_items.sold_out_replacement_amount_ore IS
  'Replacement line amount in öre (charge uses this instead of original when replaced).';

ALTER TABLE order_reservation_items
  ADD COLUMN IF NOT EXISTS sold_out_choice_at TIMESTAMPTZ;

ALTER TABLE order_reservation_items
  ADD COLUMN IF NOT EXISTS sold_out_choice_reply_by TIMESTAMPTZ;

COMMENT ON COLUMN order_reservation_items.sold_out_choice_reply_by IS
  'Deadline for customer sold-out choice. No answer → remove line and do not charge (Axel 00:41).';

CREATE INDEX IF NOT EXISTS idx_order_reservation_items_sold_out_pending
  ON order_reservation_items (sold_out_choice_state, sold_out_choice_reply_by)
  WHERE sold_out_choice_state = 'pending_choice';

-- ---------------------------------------------------------------------------
-- Action tokens for sold-out choice page (reuse pattern; separate table)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pallet_sold_out_choice_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES order_reservations(id) ON DELETE CASCADE,
  reservation_item_id UUID NOT NULL REFERENCES order_reservation_items(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pallet_sold_out_choice_tokens_reservation
  ON pallet_sold_out_choice_tokens (reservation_id);

COMMENT ON TABLE pallet_sold_out_choice_tokens IS
  'Opaque single-use tokens for sold-out-at-lock replace/remove choice links.';

ALTER TABLE public.pallet_sold_out_choice_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pallet_sold_out_choice_tokens FROM anon, authenticated;
GRANT ALL ON public.pallet_sold_out_choice_tokens TO service_role;

-- ---------------------------------------------------------------------------
-- Audit (no PII)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pallet_coverage_close_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pallet_id UUID,
  reservation_id UUID,
  event TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pallet_coverage_close_events_pallet
  ON pallet_coverage_close_events (pallet_id, created_at DESC);

COMMENT ON TABLE pallet_coverage_close_events IS
  'Append-only coverage-close audit (codes/booleans/ids only — no PII).';

ALTER TABLE public.pallet_coverage_close_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pallet_coverage_close_events FROM anon, authenticated;
GRANT ALL ON public.pallet_coverage_close_events TO service_role;
