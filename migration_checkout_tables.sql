-- Migration: Create user_addresses and order_reservations tables
-- Date: 2025-01-02

-- Create user_addresses table
CREATE TABLE IF NOT EXISTS user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address_street TEXT NOT NULL,
  address_postcode TEXT NOT NULL,
  address_city TEXT NOT NULL,
  country_code TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create order_reservations table
CREATE TABLE IF NOT EXISTS order_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  cart_id UUID REFERENCES carts(id),
  address_id UUID REFERENCES user_addresses(id),
  payment_customer_id TEXT,
  payment_method_id TEXT,
  pickup_zone_id UUID REFERENCES pallet_zones(id),
  delivery_zone_id UUID REFERENCES pallet_zones(id),
  status TEXT NOT NULL DEFAULT 'placed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create order_reservation_items table
CREATE TABLE IF NOT EXISTS order_reservation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES order_reservations(id) ON DELETE CASCADE,
  item_id UUID REFERENCES wines(id),
  quantity INTEGER NOT NULL,
  price_band TEXT NOT NULL DEFAULT 'market'
);

-- Create indexes (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_order_reservations_user_id ON order_reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_order_reservations_cart_id ON order_reservations(cart_id);
CREATE INDEX IF NOT EXISTS idx_order_reservation_items_reservation_id ON order_reservation_items(reservation_id);

-- Add RLS policies (only if not already enabled)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_addresses' AND schemaname = 'public') THEN
    ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'order_reservations' AND schemaname = 'public') THEN
    ALTER TABLE order_reservations ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'order_reservation_items' AND schemaname = 'public') THEN
    ALTER TABLE order_reservation_items ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- User addresses policies (drop and recreate to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own addresses" ON user_addresses;
DROP POLICY IF EXISTS "Users can insert their own addresses" ON user_addresses;
DROP POLICY IF EXISTS "Users can update their own addresses" ON user_addresses;

CREATE POLICY "Users can view their own addresses" ON user_addresses
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own addresses" ON user_addresses
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own addresses" ON user_addresses
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

-- Order reservations policies (drop and recreate to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own reservations" ON order_reservations;
DROP POLICY IF EXISTS "Users can insert their own reservations" ON order_reservations;
DROP POLICY IF EXISTS "Users can update their own reservations" ON order_reservations;

CREATE POLICY "Users can view their own reservations" ON order_reservations
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own reservations" ON order_reservations
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own reservations" ON order_reservations
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

-- Order reservation items policies (drop and recreate to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own reservation items" ON order_reservation_items;
DROP POLICY IF EXISTS "Users can insert their own reservation items" ON order_reservation_items;

CREATE POLICY "Users can view their own reservation items" ON order_reservation_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM order_reservations 
      WHERE order_reservations.id = order_reservation_items.reservation_id 
      AND (order_reservations.user_id = auth.uid() OR order_reservations.user_id IS NULL)
    )
  );

CREATE POLICY "Users can insert their own reservation items" ON order_reservation_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM order_reservations 
      WHERE order_reservations.id = order_reservation_items.reservation_id 
      AND (order_reservations.user_id = auth.uid() OR order_reservations.user_id IS NULL)
    )
  );
