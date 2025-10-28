-- Check profiles and user_events relationship
-- Run this in Supabase SQL Editor

-- 1. Check if profiles table exists and has data
SELECT 
  id,
  full_name,
  email,
  created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check unique user_ids from user_events
SELECT 
  COUNT(DISTINCT user_id) as total_users_with_events
FROM user_events
WHERE user_id IS NOT NULL;

-- 3. Check if there's a relationship between profiles and events
SELECT 
  ue.user_id,
  p.full_name,
  p.email,
  COUNT(*) as event_count
FROM user_events ue
LEFT JOIN profiles p ON p.id = ue.user_id
WHERE ue.user_id IS NOT NULL
GROUP BY ue.user_id, p.full_name, p.email
ORDER BY event_count DESC
LIMIT 10;

-- 4. Check if user_ids match between profiles and events
SELECT 
  COUNT(*) as matching_profiles
FROM user_events ue
INNER JOIN profiles p ON p.id = ue.user_id
WHERE ue.user_id IS NOT NULL;

