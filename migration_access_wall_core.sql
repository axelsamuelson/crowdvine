-- Access Wall Core: DB Patches
-- Add access_granted_at and invite_code_used to profiles
-- Add RLS policies to sensitive tables

-- Profiles: permanent access flag + tracking of which code
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS access_granted_at timestamptz,
  ADD COLUMN IF NOT EXISTS invite_code_used text;

CREATE INDEX IF NOT EXISTS idx_profiles_access_granted ON profiles(access_granted_at);

-- Minimal RLS on sensitive tables
-- Enable RLS if not already enabled
ALTER TABLE IF EXISTS bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS p_bookings_access ON bookings
FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.access_granted_at IS NOT NULL)
);

ALTER TABLE IF EXISTS producers ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS p_producers_access ON producers
FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.access_granted_at IS NOT NULL)
);

ALTER TABLE IF EXISTS campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS p_campaigns_access ON campaigns
FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.access_granted_at IS NOT NULL)
);

ALTER TABLE IF EXISTS campaign_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS p_campaign_items_access ON campaign_items
FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.access_granted_at IS NOT NULL)
);

-- Add RLS for wines table if it exists
ALTER TABLE IF EXISTS wines ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS p_wines_access ON wines
FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.access_granted_at IS NOT NULL)
);

-- Add RLS for pallet_zones table
ALTER TABLE IF EXISTS pallet_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS p_pallet_zones_access ON pallet_zones
FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.access_granted_at IS NOT NULL)
);

-- Add RLS for order_reservations table
ALTER TABLE IF EXISTS order_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS p_order_reservations_access ON order_reservations
FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.access_granted_at IS NOT NULL)
);

-- Add RLS for order_reservation_items table
ALTER TABLE IF EXISTS order_reservation_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS p_order_reservation_items_access ON order_reservation_items
FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.access_granted_at IS NOT NULL)
);
