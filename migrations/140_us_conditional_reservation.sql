-- Migration 140: US conditional reservation (SetupIntent only, no auto-charge until approved)
-- Date: 2026-04-28
-- TODO (before first US charge): legal/logistics must confirm allowed state, license, carrier,
-- adult signature, tax/duties, and terms. This migration adds technical fields only.

-- 1) Profile region (US state / other markets later)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS region TEXT;

COMMENT ON COLUMN profiles.region IS
  'ISO-like region: US = two-letter state code (e.g. CA). Required for US conditional checkout.';

-- 2) Terms / consent audit trail
CREATE TABLE IF NOT EXISTS market_terms_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  market_code TEXT NOT NULL,
  country_code TEXT NOT NULL,
  region TEXT,
  terms_version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_market_terms_acceptances_user_id
  ON market_terms_acceptances(user_id);

CREATE INDEX IF NOT EXISTS idx_market_terms_acceptances_country
  ON market_terms_acceptances(country_code);

CREATE INDEX IF NOT EXISTS idx_market_terms_acceptances_market
  ON market_terms_acceptances(market_code);

COMMENT ON TABLE market_terms_acceptances IS
  'Recorded acceptances for market-specific checkout terms (e.g. US conditional reservation).';

ALTER TABLE market_terms_acceptances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS market_terms_acceptances_insert_own ON market_terms_acceptances;
CREATE POLICY market_terms_acceptances_insert_own
  ON market_terms_acceptances
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS market_terms_acceptances_select_own ON market_terms_acceptances;
CREATE POLICY market_terms_acceptances_select_own
  ON market_terms_acceptances
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 3) order_reservations: market + conditional charge gates
ALTER TABLE order_reservations
  ADD COLUMN IF NOT EXISTS market_code TEXT,
  ADD COLUMN IF NOT EXISTS country_code TEXT,
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS is_conditional BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS charge_blocked_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_order_reservations_market_code
  ON order_reservations(market_code)
  WHERE market_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_reservations_is_conditional
  ON order_reservations(is_conditional)
  WHERE is_conditional = true;

COMMENT ON COLUMN order_reservations.is_conditional IS
  'When true, reservation must not be auto-charged until explicitly approved.';

COMMENT ON COLUMN order_reservations.charge_blocked_reason IS
  'Non-null blocks off-session charging until cleared by admin (e.g. US_LEGAL_LOGISTICS_REVIEW_REQUIRED).';
