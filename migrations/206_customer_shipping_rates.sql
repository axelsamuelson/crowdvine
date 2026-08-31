-- Migration 206: Canonical PACT customer shipping REVENUE rates.
-- Separate from outbound carrier COST and inbound pallet freight.
-- Do NOT seed a commercial price — leave empty until business configures.

CREATE TABLE IF NOT EXISTS customer_shipping_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL DEFAULT 'pact' CHECK (channel IN ('pact')),
  country_code CHAR(2),
  flat_fee_cents INTEGER NOT NULL DEFAULT 0 CHECK (flat_fee_cents >= 0),
  free_shipping BOOLEAN NOT NULL DEFAULT FALSE,
  free_shipping_threshold_cents INTEGER
    CHECK (
      free_shipping_threshold_cents IS NULL
      OR free_shipping_threshold_cents >= 0
    ),
  min_bottles INTEGER CHECK (min_bottles IS NULL OR min_bottles >= 0),
  max_bottles INTEGER CHECK (max_bottles IS NULL OR max_bottles >= 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles (id) ON DELETE SET NULL,
  CONSTRAINT customer_shipping_rates_valid_window
    CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from),
  CONSTRAINT customer_shipping_rates_bottle_window
    CHECK (
      min_bottles IS NULL
      OR max_bottles IS NULL
      OR max_bottles >= min_bottles
    )
);

CREATE INDEX IF NOT EXISTS idx_customer_shipping_rates_active
  ON customer_shipping_rates (channel, active, country_code)
  WHERE active = TRUE;

COMMENT ON TABLE customer_shipping_rates IS
  'Customer-facing shipping REVENUE (what PACT charges at checkout). Not carrier cost. Not inbound freight. Empty until admin configures an authoritative rate.';

COMMENT ON COLUMN customer_shipping_rates.flat_fee_cents IS
  'Gross customer shipping fee in öre (inkl moms for B2C) when free_shipping is false.';

ALTER TABLE customer_shipping_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access customer_shipping_rates"
  ON customer_shipping_rates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND (
          profiles.role = 'admin'
          OR (profiles.roles IS NOT NULL AND 'admin' = ANY (profiles.roles))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND (
          profiles.role = 'admin'
          OR (profiles.roles IS NOT NULL AND 'admin' = ANY (profiles.roles))
        )
    )
  );
