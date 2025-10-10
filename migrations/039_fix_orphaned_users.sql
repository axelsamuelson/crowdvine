-- ================================================
-- Migration 039: Fix Orphaned Users
-- ================================================
-- Purpose: Create missing profiles and memberships for users
-- who were created via broken triggers
-- ================================================

BEGIN;

-- ================================================
-- 1. CREATE MISSING PROFILES
-- ================================================

-- Find users in auth.users who don't have profiles
INSERT INTO public.profiles (id, email, full_name, role)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email),
  'user'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Log how many profiles were created
DO $$
DECLARE
  created_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO created_count
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE p.id IS NULL;
  
  RAISE NOTICE 'Created % missing profiles', created_count;
END $$;

-- ================================================
-- 2. CREATE MISSING MEMBERSHIPS
-- ================================================

-- Find users who have profiles but no memberships
INSERT INTO public.user_memberships (
  user_id,
  level,
  impact_points,
  invite_quota_monthly,
  invites_used_this_month,
  last_quota_reset
)
SELECT 
  p.id,
  'basic'::membership_level,
  0,
  2,
  0,
  NOW()
FROM public.profiles p
LEFT JOIN public.user_memberships um ON um.user_id = p.id
WHERE um.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Log how many memberships were created
DO $$
DECLARE
  created_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO created_count
  FROM public.profiles p
  LEFT JOIN public.user_memberships um ON um.user_id = p.id
  WHERE um.user_id IS NULL;
  
  RAISE NOTICE 'Created % missing memberships', created_count;
END $$;

-- ================================================
-- 3. UPDATE ADMIN USERS
-- ================================================

-- Ensure admin users have admin membership level
UPDATE user_memberships
SET 
  level = 'admin',
  invite_quota_monthly = 999999
WHERE user_id IN (
  SELECT id FROM profiles WHERE role = 'admin'
  OR email IN ('admin@pactwines.com', 'ave.samuelson@gmail.com')
);

COMMIT;

-- ================================================
-- VERIFICATION
-- ================================================

-- Check for orphaned users (should be 0)
SELECT 
  'Orphaned users (auth.users without profiles)' as check_name,
  COUNT(*) as count
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL

UNION ALL

SELECT 
  'Users without memberships' as check_name,
  COUNT(*) as count
FROM public.profiles p
LEFT JOIN public.user_memberships um ON um.user_id = p.id
WHERE um.user_id IS NULL;

-- Should return 0 for both

-- ================================================
-- NOTES
-- ================================================
-- This migration:
-- - Creates profiles for auth users that don't have one
-- - Creates basic memberships for profiles that don't have one
-- - Uses auth.users.raw_user_meta_data->>'full_name' if available
-- - Sets all new users to 'basic' level (can be upgraded via invitations)
-- - Ensures admin users have admin level
-- ================================================

