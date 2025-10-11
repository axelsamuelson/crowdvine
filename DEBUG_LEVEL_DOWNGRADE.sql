-- =====================================================
-- Debug Script: Level Downgrade Issue
-- =====================================================
-- 
-- Run these queries to understand what happened when user
-- was downgraded from Bronze to Basic after earning IP
-- =====================================================

-- 1. Check user's current status
SELECT 
  u.email,
  m.level as current_level,
  m.impact_points as current_ip,
  get_level_from_points(m.impact_points) as calculated_level_from_ip,
  m.level_assigned_at as when_level_set,
  m.invite_quota_monthly,
  m.created_at
FROM user_memberships m
JOIN auth.users u ON u.id = m.user_id
WHERE u.email = 'your-email@example.com'; -- Replace with your email

-- 2. Check recent IP events
SELECT 
  event_type,
  points_earned,
  description,
  created_at
FROM impact_point_events
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com')
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check if there was a level_upgrade event (downgrade would also log here)
SELECT 
  event_type,
  points_earned,
  description,
  created_at
FROM impact_point_events
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com')
  AND event_type = 'level_upgrade'
ORDER BY created_at DESC
LIMIT 5;

-- 4. Check all users who might have been incorrectly downgraded
SELECT 
  u.email,
  m.level as current_level,
  m.impact_points as current_ip,
  get_level_from_points(m.impact_points) as should_be_level,
  CASE 
    WHEN get_level_from_points(m.impact_points)::TEXT != m.level::TEXT 
    THEN '⚠️ MISMATCH'
    ELSE '✅ OK'
  END as status
FROM user_memberships m
JOIN auth.users u ON u.id = m.user_id
WHERE m.level NOT IN ('admin', 'requester')
ORDER BY m.impact_points DESC;

-- 5. Fix your user specifically (run after verifying the issue)
-- UNCOMMENT AND MODIFY BEFORE RUNNING:

/*
UPDATE user_memberships
SET 
  level = 'brons',  -- Set back to Bronze
  invite_quota_monthly = 5,
  level_assigned_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');
*/

-- 6. After running Migration 044, test the fix
DO $$
DECLARE
  test_user_id UUID;
  result_level membership_level;
BEGIN
  -- Get your user ID
  SELECT id INTO test_user_id FROM auth.users WHERE email = 'your-email@example.com';
  
  -- Test the fixed function
  result_level := check_and_upgrade_level(test_user_id);
  
  RAISE NOTICE 'Function returned level: %', result_level;
END $$;

