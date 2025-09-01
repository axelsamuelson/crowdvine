-- Crowdvine Admin MVP Database Migration
-- Run these statements in Supabase SQL Editor

-- 1. Create profiles table for user roles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'producer', 'admin')),
  producer_id UUID REFERENCES producers(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add missing fields to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS tolerance_cents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'fulfilled'));

-- 3. Create pallet_zone_members table for zone membership
CREATE TABLE IF NOT EXISTS pallet_zone_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pallet_zone_id UUID REFERENCES pallet_zones(id) ON DELETE CASCADE NOT NULL,
  producer_id UUID REFERENCES producers(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(pallet_zone_id, producer_id)
);

-- 4. Add RLS policies for security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pallet_zone_members ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Pallet zone members policies
CREATE POLICY "Admins can manage zone members" ON pallet_zone_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 5. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Add trigger to profiles table
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
