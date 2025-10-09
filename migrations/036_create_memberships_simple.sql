-- ================================================
-- Simple User Membership Creation
-- Migration 036: Create memberships for all existing users
-- ================================================

-- This is a simplified version that should work regardless of invitation history

-- ================================================
-- 1. CREATE BASIC MEMBERSHIP FOR ALL USERS
-- ================================================

-- Insert membership for every user that doesn't have one
INSERT INTO user_memberships (
  user_id, 
  level, 
  impact_points, 
  invite_quota_monthly,
  invites_used_this_month,
  last_quota_reset
)
SELECT 
  u.id as user_id,
  'basic' as level,  -- Start everyone at basic
  0 as impact_points,
  2 as invite_quota_monthly,
  0 as invites_used_this_month,
  NOW() as last_quota_reset
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM user_memberships WHERE user_id = u.id
);

-- ================================================
-- 2. SET ADMIN USERS TO ADMIN LEVEL
-- ================================================

-- Set users with admin role to admin level
UPDATE user_memberships 
SET 
  level = 'admin',
  invite_quota_monthly = 999999,
  level_assigned_at = NOW(),
  updated_at = NOW()
WHERE user_id IN (
  SELECT id FROM profiles WHERE role = 'admin'
);

-- Set specific admin emails to admin level
UPDATE user_memberships 
SET 
  level = 'admin',
  invite_quota_monthly = 999999,
  level_assigned_at = NOW(),
  updated_at = NOW()
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email IN ('admin@pactwines.com', 'ave.samuelson@gmail.com')
);

-- ================================================
-- 3. CALCULATE IP FROM INVITATION HISTORY
-- ================================================

-- Update impact points based on accepted invitations
UPDATE user_memberships m
SET impact_points = (
  SELECT COALESCE(COUNT(*)::INTEGER, 0)
  FROM invitation_codes ic
  WHERE ic.created_by = m.user_id
  AND ic.used_at IS NOT NULL
);

-- ================================================
-- 4. AUTO-UPGRADE LEVELS BASED ON IP
-- ================================================

-- Upgrade to Guld (35+ IP)
UPDATE user_memberships 
SET 
  level = 'guld',
  invite_quota_monthly = 50,
  level_assigned_at = NOW()
WHERE impact_points >= 35 
AND level != 'admin';

-- Upgrade to Silver (15-34 IP)
UPDATE user_memberships 
SET 
  level = 'silver',
  invite_quota_monthly = 12,
  level_assigned_at = NOW()
WHERE impact_points >= 15 
AND impact_points < 35
AND level != 'admin';

-- Upgrade to Brons (5-14 IP)
UPDATE user_memberships 
SET 
  level = 'brons',
  invite_quota_monthly = 5,
  level_assigned_at = NOW()
WHERE impact_points >= 5 
AND impact_points < 15
AND level != 'admin';

-- ================================================
-- 5. CREATE MIGRATION EVENTS
-- ================================================

-- Log migration event for users with IP
INSERT INTO impact_point_events (
  user_id,
  event_type,
  points_earned,
  description
)
SELECT 
  user_id,
  'migration',
  impact_points,
  'Migrated from old rewards system with ' || impact_points || ' IP'
FROM user_memberships
WHERE impact_points > 0
AND NOT EXISTS (
  SELECT 1 FROM impact_point_events 
  WHERE user_id = user_memberships.user_id 
  AND event_type = 'migration'
);

-- ================================================
-- 6. VERIFICATION
-- ================================================

-- Count users by level
SELECT level, COUNT(*) as user_count, SUM(impact_points) as total_ip
FROM user_memberships
GROUP BY level
ORDER BY CASE level
  WHEN 'requester' THEN 0
  WHEN 'basic' THEN 1
  WHEN 'brons' THEN 2
  WHEN 'silver' THEN 3
  WHEN 'guld' THEN 4
  WHEN 'admin' THEN 5
END;

-- ================================================
-- MIGRATION COMPLETE
-- ================================================

