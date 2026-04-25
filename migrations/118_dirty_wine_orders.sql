-- Manual / online Dirty Wine B2B orders listed under Admin → Bookings → Dirty Wine → Ordrar.
-- order_type: 'offline' = admin-created invoice order; 'online' = customer checkout (future integration).

CREATE TABLE dirty_wine_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_type TEXT NOT NULL CHECK (order_type IN ('online', 'offline')),
  order_id TEXT NOT NULL,
  order_date DATE NOT NULL,
  customer_name TEXT NOT NULL DEFAULT '',
  customer_email TEXT NOT NULL DEFAULT '',
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  status TEXT NOT NULL DEFAULT 'Registrerad',
  invoice_data JSONB,
  created_by UUID REFERENCES profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX dirty_wine_orders_created_at_idx ON dirty_wine_orders (created_at DESC);
CREATE INDEX dirty_wine_orders_type_idx ON dirty_wine_orders (order_type);

COMMENT ON TABLE dirty_wine_orders IS 'B2B Dirty Wine orders: offline = manual invoice from admin; online = customer orders (future).';

ALTER TABLE dirty_wine_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access dirty_wine_orders"
  ON dirty_wine_orders
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND (profiles.role = 'admin' OR (profiles.roles IS NOT NULL AND 'admin' = ANY (profiles.roles)))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND (profiles.role = 'admin' OR (profiles.roles IS NOT NULL AND 'admin' = ANY (profiles.roles)))
    )
  );
