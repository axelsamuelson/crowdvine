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

-- 4. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage zone members" ON pallet_zone_members;

-- 5. Add RLS policies for security (FIXED - no recursion)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pallet_zone_members ENABLE ROW LEVEL SECURITY;

-- Profiles policies (simplified to avoid recursion)
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow all operations for now (we'll restrict later with proper admin check)
CREATE POLICY "Allow all operations temporarily" ON profiles
  FOR ALL USING (true);

-- Pallet zone members policies (simplified)
CREATE POLICY "Allow all operations temporarily" ON pallet_zone_members
  FOR ALL USING (true);

-- 6. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. Add trigger to profiles table
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 8. Insert a default admin profile if none exists
INSERT INTO profiles (id, email, role)
SELECT 
  auth.uid(),
  auth.jwt() ->> 'email',
  'admin'
WHERE auth.uid() IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
ON CONFLICT (id) DO NOTHING;
