-- Fix for users missing membership entries
-- Run this in Supabase SQL Editor

-- Find users without memberships
SELECT 
  p.id,
  p.email,
  p.created_at,
  p.onboarding_seen
FROM profiles p
LEFT JOIN user_memberships um ON p.id = um.user_id
WHERE um.user_id IS NULL
ORDER BY p.created_at DESC;

-- Create missing memberships for these users
-- They will default to 'basic' level
INSERT INTO user_memberships (user_id, level, impact_points, invite_quota_monthly, invites_used_this_month, last_quota_reset)
SELECT 
  p.id as user_id,
  'basic' as level,
  0 as impact_points,
  2 as invite_quota_monthly,
  0 as invites_used_this_month,
  NOW() as last_quota_reset
FROM profiles p
LEFT JOIN user_memberships um ON p.id = um.user_id
WHERE um.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Verify all users now have memberships
SELECT 
  COUNT(CASE WHEN um.user_id IS NULL THEN 1 END) as missing_memberships,
  COUNT(CASE WHEN um.user_id IS NOT NULL THEN 1 END) as has_memberships
FROM profiles p
LEFT JOIN user_memberships um ON p.id = um.user_id;
