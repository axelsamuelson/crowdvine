-- Stripe failure diagnostics for B2C Orders / admin debugging
ALTER TABLE order_reservations
  ADD COLUMN IF NOT EXISTS charge_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_decline_code TEXT,
  ADD COLUMN IF NOT EXISTS stripe_failure_code TEXT,
  ADD COLUMN IF NOT EXISTS stripe_error_type TEXT,
  ADD COLUMN IF NOT EXISTS stripe_network_advice_code TEXT,
  ADD COLUMN IF NOT EXISTS stripe_outcome_seller_message TEXT,
  ADD COLUMN IF NOT EXISTS stripe_risk_score INTEGER,
  ADD COLUMN IF NOT EXISTS payment_method_last4 TEXT,
  ADD COLUMN IF NOT EXISTS payment_method_brand TEXT;

COMMENT ON COLUMN order_reservations.charge_id IS
  'Stripe Charge ID from charge.failed or charge.succeeded';
COMMENT ON COLUMN order_reservations.stripe_decline_code IS
  'Stripe decline_code from last_payment_error or last_setup_error';
COMMENT ON COLUMN order_reservations.stripe_failure_code IS
  'Stripe code from last_payment_error (e.g. card_declined)';
COMMENT ON COLUMN order_reservations.stripe_error_type IS
  'Stripe error type (card_error, invalid_request_error, etc.)';
COMMENT ON COLUMN order_reservations.stripe_network_advice_code IS
  'Network advice code from issuer when present (last_payment_error)';
COMMENT ON COLUMN order_reservations.stripe_outcome_seller_message IS
  'Stripe outcome.seller_message on charge (e.g. charge.failed)';
COMMENT ON COLUMN order_reservations.stripe_risk_score IS
  'Stripe Radar risk score from charge.outcome when present';
COMMENT ON COLUMN order_reservations.payment_method_last4 IS
  'Last4 of card used, from expanded error/charge details when available';
COMMENT ON COLUMN order_reservations.payment_method_brand IS
  'Card brand when available from expanded error/charge details';
