-- ================================================
-- PACT Wines - User Migration to Membership System
-- Migration 035: Migrate existing users from old rewards to IP-based membership
-- ================================================

-- This migration should be run AFTER 034_membership_system.sql

-- ================================================
-- 1. MIGRATE ALL EXISTING USERS TO BASIC LEVEL
-- ================================================

-- Create membership for all users who don't have one yet
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
  
  -- Calculate level based on invitation activity
  get_level_from_points(
    COALESCE(
      (SELECT COUNT(*) 
       FROM invitation_codes 
       WHERE created_by = u.id 
       AND used_at IS NOT NULL), 
      0
    )
  ) as level,
  
  -- Calculate initial IP: +1 per accepted invitation
  -- (We'll estimate +2 for reservations manually if needed)
  COALESCE(
    (SELECT COUNT(*) 
     FROM invitation_codes 
     WHERE created_by = u.id 
     AND used_at IS NOT NULL), 
    0
  ) as impact_points,
  
  -- Set quota based on calculated level
  get_invite_quota_for_level(
    get_level_from_points(
      COALESCE(
        (SELECT COUNT(*) 
         FROM invitation_codes 
         WHERE created_by = u.id 
         AND used_at IS NOT NULL), 
        0
      )
    )
  ) as invite_quota_monthly,
  
  -- Calculate current month invite usage
  COALESCE(
    (SELECT COUNT(*) 
     FROM invitation_codes 
     WHERE created_by = u.id 
     AND created_at >= DATE_TRUNC('month', NOW())),
    0
  ) as invites_used_this_month,
  
  -- Set last reset to start of current month
  DATE_TRUNC('month', NOW()) as last_quota_reset

FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM user_memberships WHERE user_id = u.id
);

-- ================================================
-- 2. CREATE MIGRATION EVENTS FOR AUDIT LOG
-- ================================================

-- Log migration event for each user
INSERT INTO impact_point_events (
  user_id,
  event_type,
  points_earned,
  description
)
SELECT 
  m.user_id,
  'migration'::ip_event_type,
  m.impact_points,
  'Migrated from old rewards system with ' || m.impact_points || ' IP from ' || 
  COALESCE(
    (SELECT COUNT(*) FROM invitation_codes WHERE created_by = m.user_id AND used_at IS NOT NULL)::TEXT,
    '0'
  ) || ' accepted invitations'
FROM user_memberships m
WHERE NOT EXISTS (
  SELECT 1 FROM impact_point_events 
  WHERE user_id = m.user_id AND event_type = 'migration'
);

-- ================================================
-- 3. VERIFICATION QUERIES
-- ================================================

-- Check migration results
-- Run these after migration to verify:

/*
-- 1. Count users by level
SELECT level, COUNT(*) as user_count
FROM user_memberships
GROUP BY level
ORDER BY 
  CASE level
    WHEN 'requester' THEN 0
    WHEN 'basic' THEN 1
    WHEN 'brons' THEN 2
    WHEN 'silver' THEN 3
    WHEN 'guld' THEN 4
    WHEN 'admin' THEN 5
  END;

-- 2. Show users with highest IP
SELECT 
  p.email,
  p.full_name,
  m.level,
  m.impact_points,
  m.invite_quota_monthly,
  m.invites_used_this_month,
  (SELECT COUNT(*) FROM invitation_codes WHERE created_by = m.user_id AND used_at IS NOT NULL) as accepted_invites
FROM user_memberships m
JOIN profiles p ON p.id = m.user_id
ORDER BY m.impact_points DESC
LIMIT 20;

-- 3. Verify all users have membership
SELECT 
  COUNT(DISTINCT u.id) as total_users,
  COUNT(DISTINCT m.user_id) as users_with_membership,
  COUNT(DISTINCT u.id) - COUNT(DISTINCT m.user_id) as missing_memberships
FROM auth.users u
LEFT JOIN user_memberships m ON m.user_id = u.id;
*/

-- ================================================
-- 4. ADMIN USER SETUP (Manual)
-- ================================================

-- If you have admin users, update their level manually:
-- UPDATE user_memberships SET level = 'admin', invite_quota_monthly = 999999 WHERE user_id = 'ADMIN_USER_ID';

-- ================================================
-- MIGRATION COMPLETE
-- ================================================

-- After running this migration:
-- 1. Verify results using queries above
-- 2. Manually review users with high invite counts
-- 3. Adjust IP if needed for users with reservations from invited friends
-- 4. Set admin users to admin level

