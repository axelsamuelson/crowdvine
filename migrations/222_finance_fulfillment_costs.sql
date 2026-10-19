-- Migration 222: Editable fulfillment / GM2 unit-cost assumptions for Finance + wine pricing.
-- Singleton row. Defaults match Finance scenario UI + contribution assumptions.

CREATE TABLE IF NOT EXISTS finance_fulfillment_costs (
  id TEXT PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  bottles_per_order INTEGER NOT NULL DEFAULT 6
    CHECK (bottles_per_order >= 1),
  shipping_revenue_gross_cents_per_order INTEGER NOT NULL DEFAULT 9900
    CHECK (shipping_revenue_gross_cents_per_order >= 0),
  shipping_price_includes_vat BOOLEAN NOT NULL DEFAULT TRUE,
  outbound_carrier_cost_cents_per_order INTEGER NOT NULL DEFAULT 6900
    CHECK (outbound_carrier_cost_cents_per_order >= 0),
  inbound_freight_total_cents INTEGER NOT NULL DEFAULT 0
    CHECK (inbound_freight_total_cents >= 0),
  assumed_ship_quantity INTEGER NOT NULL DEFAULT 120
    CHECK (assumed_ship_quantity >= 1),
  stripe_fee_percent NUMERIC(10, 6) NOT NULL DEFAULT 0.015
    CHECK (stripe_fee_percent >= 0),
  stripe_fee_fixed_cents_per_order INTEGER NOT NULL DEFAULT 180
    CHECK (stripe_fee_fixed_cents_per_order >= 0),
  epr_cents_per_bottle INTEGER NOT NULL DEFAULT 50
    CHECK (epr_cents_per_bottle >= 0),
  refund_breakage_reserve_rate NUMERIC(10, 6) NOT NULL DEFAULT 0.01
    CHECK (refund_breakage_reserve_rate >= 0),
  vat_rate NUMERIC(10, 6) NOT NULL DEFAULT 0.25
    CHECK (vat_rate >= 0 AND vat_rate < 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES profiles (id) ON DELETE SET NULL
);

COMMENT ON TABLE finance_fulfillment_costs IS
  'Admin Finance fulfillment / GM2 unit assumptions (per order + per bottle). Used by wine pricing and scenarios.';

INSERT INTO finance_fulfillment_costs (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE finance_fulfillment_costs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access finance_fulfillment_costs"
  ON finance_fulfillment_costs;

CREATE POLICY "Admin full access finance_fulfillment_costs"
  ON finance_fulfillment_costs
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
