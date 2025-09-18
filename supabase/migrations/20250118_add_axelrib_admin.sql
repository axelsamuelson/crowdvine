-- Add admin profile for axelrib@hotmail.com
INSERT INTO profiles (id, email, role, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'axelrib@hotmail.com',
  'admin',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  role = 'admin',
  updated_at = NOW();
