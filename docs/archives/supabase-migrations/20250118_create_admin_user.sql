-- Create admin user in Supabase Auth
-- This script creates an admin user with email ave.samuelson@gmail.com
-- The password will be set to a secure random password that needs to be shared securely

-- First, let's create the user in auth.users using the admin API
-- Note: This needs to be run via Supabase Admin API, not SQL

-- For now, we'll just ensure the profile exists with admin role
-- The actual auth user creation needs to be done via Supabase Dashboard or Admin API

-- Update existing profile to ensure it has admin role
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'ave.samuelson@gmail.com';

-- If no profile exists, create one (this will fail if auth user doesn't exist)
INSERT INTO profiles (id, email, role, access_granted_at)
VALUES (
  '7122d74d-f06c-4b25-be10-0fe025607981', -- Use existing ID from debug output
  'ave.samuelson@gmail.com',
  'admin',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET role = 'admin';
