-- Migration 205: Admin Finance — OpEx ledger + persist charged shipping on reservations.
-- Management accounting only. Does NOT rewrite historical economics_snapshot rows.
-- Does NOT change pallet readiness (120) or physical capacity (720).

-- Persist what the customer was charged for shipping at checkout (öre, inkl moms for B2C).
ALTER TABLE order_reservations
  ADD COLUMN IF NOT EXISTS shipping_revenue_gross_cents INTEGER;

COMMENT ON COLUMN order_reservations.shipping_revenue_gross_cents IS
  'Customer shipping charged at checkout confirm, öre (gross). Null = legacy row before Finance persistence. Never invent for historical rows.';

CREATE INDEX IF NOT EXISTS idx_order_reservations_shipping_revenue
  ON order_reservations (created_at DESC)
  WHERE shipping_revenue_gross_cents IS NOT NULL;

-- Lightweight admin-managed OpEx (below GM3). Empty by default — do not seed invented expenses.
CREATE TABLE IF NOT EXISTS finance_opex_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'SEK' CHECK (currency = 'SEK'),
  cadence TEXT NOT NULL CHECK (cadence IN ('monthly', 'annual', 'one_off')),
  channel TEXT NOT NULL CHECK (channel IN ('pact', 'dirtywine', 'shared')),
  shared_pact_percent NUMERIC(5, 2)
    CHECK (
      shared_pact_percent IS NULL
      OR (shared_pact_percent >= 0 AND shared_pact_percent <= 100)
    ),
  starts_on DATE NOT NULL,
  ends_on DATE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles (id) ON DELETE SET NULL,
  CONSTRAINT finance_opex_ends_after_starts
    CHECK (ends_on IS NULL OR ends_on >= starts_on)
);

CREATE INDEX IF NOT EXISTS idx_finance_opex_active_period
  ON finance_opex_entries (active, starts_on, ends_on);

CREATE INDEX IF NOT EXISTS idx_finance_opex_channel
  ON finance_opex_entries (channel)
  WHERE active = TRUE;

COMMENT ON TABLE finance_opex_entries IS
  'Admin Finance OpEx (management accounting). Not statutory bookkeeping. Empty until admins enter real costs.';

ALTER TABLE finance_opex_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access finance_opex_entries"
  ON finance_opex_entries
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
