-- Migration 127: Stripe customer + payment mode foundations
-- Date: 2026-04-26
-- Purpose: Prepare DB for SetupIntent + dynamic-mode payments (no charge logic here)

-- 1. Stripe customer ID on user_memberships
ALTER TABLE user_memberships
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

CREATE INDEX IF NOT EXISTS idx_user_memberships_stripe_customer_id
  ON user_memberships(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

COMMENT ON COLUMN user_memberships.stripe_customer_id IS
  'Stripe Customer object ID. Created lazily on first payment setup.';

-- 2. Setup intent and payment method tracking on order_reservations
ALTER TABLE order_reservations
  ADD COLUMN IF NOT EXISTS setup_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_method_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_mode TEXT,
  ADD COLUMN IF NOT EXISTS payment_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_last_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_failed_reason TEXT;

-- payment_mode values: 'setup_intent' (deferred) or 'payment_intent' (direct)
ALTER TABLE order_reservations
  DROP CONSTRAINT IF EXISTS order_reservations_payment_mode_check;
ALTER TABLE order_reservations
  ADD CONSTRAINT order_reservations_payment_mode_check
  CHECK (payment_mode IN ('setup_intent', 'payment_intent') OR payment_mode IS NULL);

CREATE INDEX IF NOT EXISTS idx_order_reservations_setup_intent_id
  ON order_reservations(setup_intent_id)
  WHERE setup_intent_id IS NOT NULL;

COMMENT ON COLUMN order_reservations.setup_intent_id IS
  'Stripe SetupIntent ID for deferred capture (pallet not full at order time).';
COMMENT ON COLUMN order_reservations.payment_method_id IS
  'Stripe PaymentMethod ID saved via SetupIntent. Used to charge later.';
COMMENT ON COLUMN order_reservations.payment_mode IS
  'How this order is paid: setup_intent (deferred) or payment_intent (immediate).';

-- 3. PACT Points pending state on pact_points_events
ALTER TABLE pact_points_events
  ADD COLUMN IF NOT EXISTS pending_until_payment BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN pact_points_events.pending_until_payment IS
  'When true, this redemption is provisional. Points are reserved but not 
   actually deducted until the order payment succeeds. If payment fails or 
   order cancels, the pending redemption is reversed.';

CREATE INDEX IF NOT EXISTS idx_pact_points_events_pending
  ON pact_points_events(user_id, pending_until_payment)
  WHERE pending_until_payment = true;

