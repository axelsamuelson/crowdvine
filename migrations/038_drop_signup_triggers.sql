-- ================================================
-- Migration 038: Drop Signup Triggers
-- ================================================
-- Purpose: Remove automatic triggers that cause conflicts
-- during invitation-based user signup
-- ================================================
-- CRITICAL: These triggers are causing "Database error creating new user"
-- We will handle profile and membership creation manually in API
-- ================================================

BEGIN;

-- ================================================
-- 1. DROP TRIGGERS ON auth.users
-- ================================================

-- Drop profile creation trigger (from old migrations)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop membership creation trigger (from migration 034)
DROP TRIGGER IF EXISTS on_user_membership_created ON auth.users;

-- ================================================
-- 2. KEEP THE FUNCTIONS (might be used elsewhere)
-- ================================================

-- Keep handle_new_user() function (in case we need it later)
-- Keep handle_new_user_membership() function (in case we need it later)

-- Note: Functions are kept but not triggered automatically
-- This allows manual calls if needed

-- ================================================
-- 3. VERIFICATION
-- ================================================

-- Verify triggers are dropped
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    RAISE EXCEPTION 'Trigger on_auth_user_created still exists!';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_user_membership_created'
  ) THEN
    RAISE EXCEPTION 'Trigger on_user_membership_created still exists!';
  END IF;
  
  RAISE NOTICE 'All signup triggers successfully dropped';
END $$;

COMMIT;

-- ================================================
-- IMPORTANT NOTES
-- ================================================
-- After this migration:
-- - admin.createUser() will NOT automatically create profile
-- - admin.createUser() will NOT automatically create membership
-- - API endpoints MUST manually create profile and membership
-- - Existing users are not affected
-- - Future users created via API will use manual creation
-- ================================================

-- ================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ================================================
-- To restore triggers:
-- 
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW
--   EXECUTE FUNCTION public.handle_new_user();
--
-- CREATE TRIGGER on_user_membership_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW
--   EXECUTE FUNCTION handle_new_user_membership();
-- ================================================

