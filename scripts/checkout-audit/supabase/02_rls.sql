-- RLS for crowdvine-checkout-audit (msdfjrrokcmjifetuwgc) only.
-- Service role bypasses RLS; anon/authenticated get least-privilege app-shaped policies.
-- Idempotent: drop+create named policies.

DO $$
BEGIN
  IF (
    SELECT value FROM checkout_audit_meta WHERE key = 'project_ref'
  ) IS DISTINCT FROM 'msdfjrrokcmjifetuwgc' THEN
    RAISE EXCEPTION 'REFUSED: wrong project_ref for RLS apply';
  END IF;
END $$;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_zone_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_zone_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_shipping_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE pallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pallet_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE wines ENABLE ROW LEVEL SECURITY;
ALTER TABLE producers ENABLE ROW LEVEL SECURITY;
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_drops ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_reservation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_audit_meta ENABLE ROW LEVEL SECURITY;

-- Profiles: own row
DROP POLICY IF EXISTS audit_profiles_select_own ON profiles;
CREATE POLICY audit_profiles_select_own ON profiles
  FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS audit_profiles_update_own ON profiles;
CREATE POLICY audit_profiles_update_own ON profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS audit_profiles_insert_own ON profiles;
CREATE POLICY audit_profiles_insert_own ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Carts / items: owner or session cart
DROP POLICY IF EXISTS audit_carts_all ON carts;
CREATE POLICY audit_carts_all ON carts
  FOR ALL USING (auth.uid() = user_id OR session_id IS NOT NULL)
  WITH CHECK (auth.uid() = user_id OR session_id IS NOT NULL);

DROP POLICY IF EXISTS audit_cart_items_all ON cart_items;
CREATE POLICY audit_cart_items_all ON cart_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM carts c
      WHERE c.id = cart_items.cart_id
        AND (c.user_id = auth.uid() OR c.session_id IS NOT NULL)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM carts c
      WHERE c.id = cart_items.cart_id
        AND (c.user_id = auth.uid() OR c.session_id IS NOT NULL)
    )
  );

-- User addresses / zone templates: own only
DROP POLICY IF EXISTS audit_user_addresses_own ON user_addresses;
CREATE POLICY audit_user_addresses_own ON user_addresses
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS audit_uzp_own ON user_zone_preferences;
CREATE POLICY audit_uzp_own ON user_zone_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS audit_uza_own ON user_zone_addresses;
CREATE POLICY audit_uza_own ON user_zone_addresses
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Catalog / zones / markets: public read (checkout browse)
DROP POLICY IF EXISTS audit_pallets_select ON pallets;
CREATE POLICY audit_pallets_select ON pallets FOR SELECT USING (true);
DROP POLICY IF EXISTS audit_pallet_zones_select ON pallet_zones;
CREATE POLICY audit_pallet_zones_select ON pallet_zones FOR SELECT USING (true);
DROP POLICY IF EXISTS audit_wines_select ON wines;
CREATE POLICY audit_wines_select ON wines FOR SELECT USING (true);
DROP POLICY IF EXISTS audit_producers_select ON producers;
CREATE POLICY audit_producers_select ON producers FOR SELECT USING (true);
DROP POLICY IF EXISTS audit_markets_select ON markets;
CREATE POLICY audit_markets_select ON markets FOR SELECT USING (true);
DROP POLICY IF EXISTS audit_market_countries_select ON market_countries;
CREATE POLICY audit_market_countries_select ON market_countries FOR SELECT USING (true);
DROP POLICY IF EXISTS audit_geo_zones_select ON geo_zones;
CREATE POLICY audit_geo_zones_select ON geo_zones FOR SELECT USING (true);
DROP POLICY IF EXISTS audit_market_drops_select ON market_drops;
CREATE POLICY audit_market_drops_select ON market_drops FOR SELECT USING (true);
DROP POLICY IF EXISTS audit_shipping_regions_select ON shipping_regions;
CREATE POLICY audit_shipping_regions_select ON shipping_regions FOR SELECT USING (true);

-- Shipping rates: no anon/authenticated policies (service role only) — matches prod intent
-- Order reservations: users read own.
-- NOTE: confirm route inserts items via user-scoped supabaseServer() — see
-- 06_reservation_write_policies.sql for INSERT/UPDATE policies required for browser E2E.
DROP POLICY IF EXISTS audit_order_reservations_select_own ON order_reservations;
CREATE POLICY audit_order_reservations_select_own ON order_reservations
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS audit_order_reservation_items_select_own ON order_reservation_items;
CREATE POLICY audit_order_reservation_items_select_own ON order_reservation_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM order_reservations r
      WHERE r.id = order_reservation_items.reservation_id
        AND r.user_id = auth.uid()
    )
  );

-- Meta readable by authenticated (ops proof)
DROP POLICY IF EXISTS audit_meta_select ON checkout_audit_meta;
CREATE POLICY audit_meta_select ON checkout_audit_meta
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

INSERT INTO checkout_audit_meta (key, value) VALUES
  ('rls_applied', now()::text)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
