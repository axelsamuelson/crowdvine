-- Check the structure of the profiles table
-- This will show us if full_name column exists

-- 1. Check if full_name column exists in profiles table
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. Check sample data from profiles table
SELECT 
  id,
  email,
  full_name,
  role,
  created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 5;

-- 3. Check if user_events has user_ids that exist in profiles
SELECT 
  ue.user_id,
  CASE 
    WHEN p.id IS NULL THEN 'No profile found'
    WHEN p.full_name IS NULL OR p.full_name = '' THEN 'Profile exists but no full_name'
    ELSE 'Profile with full_name'
  END as status,
  p.full_name,
  p.email,
  COUNT(*) as event_count
FROM user_events ue
LEFT JOIN profiles p ON p.id = ue.user_id
WHERE ue.user_id IS NOT NULL
GROUP BY ue.user_id, p.id, p.full_name, p.email
ORDER BY event_count DESC
LIMIT 10;

