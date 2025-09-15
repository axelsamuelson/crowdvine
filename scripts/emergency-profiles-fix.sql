-- Emergency fix for profiles table
-- Run this in Supabase SQL Editor if the above doesn't work

-- 1. Drop existing profiles table if it exists
DROP TABLE IF EXISTS profiles CASCADE;

-- 2. Create profiles table WITHOUT foreign key constraint initially
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'producer', 'admin')),
  producer_id UUID REFERENCES producers(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS with simple policy
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations temporarily" ON profiles
  FOR ALL USING (true);

-- 4. Create trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 5. Verify
SELECT 'Emergency profiles table created successfully' as status;
