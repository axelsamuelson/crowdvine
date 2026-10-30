-- Create admin profile for ave.samuelson@gmail.com
INSERT INTO profiles (id, email, role, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'ave.samuelson@gmail.com',
  'admin',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  role = 'admin',
  updated_at = NOW();
