-- ================================================
-- Migration 037: Fix Invitation RLS Policies
-- ================================================
-- Purpose: Simplify and fix RLS policies for invitation_codes table
-- to allow proper access for both service_role and authenticated users
-- ================================================

BEGIN;

-- ================================================
-- 1. DROP OLD RESTRICTIVE POLICIES
-- ================================================

DROP POLICY IF EXISTS "Allow authenticated users to insert invitation codes" ON invitation_codes;
DROP POLICY IF EXISTS "Allow authenticated users to update invitation codes" ON invitation_codes;
DROP POLICY IF EXISTS "Allow authenticated users to read invitation codes" ON invitation_codes;
DROP POLICY IF EXISTS "Allow public to validate invitation codes" ON invitation_codes;

-- ================================================
-- 2. CREATE NEW SIMPLIFIED POLICIES
-- ================================================

-- Allow users to read their own invitations + public can read active/valid invitations for validation
CREATE POLICY "Users can read own invitations or validate active ones" ON invitation_codes
  FOR SELECT USING (
    auth.uid() = created_by 
    OR (is_active = TRUE AND expires_at > NOW())
  );

-- Allow any authenticated user to insert invitations
-- (Backend will validate quota and permissions)
CREATE POLICY "Authenticated users can insert invitations" ON invitation_codes
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Allow users to update their own invitations
CREATE POLICY "Users can update own invitations" ON invitation_codes
  FOR UPDATE USING (
    auth.uid() = created_by
  );

-- Allow users to delete/deactivate their own invitations
CREATE POLICY "Users can delete own invitations" ON invitation_codes
  FOR DELETE USING (
    auth.uid() = created_by
  );

-- ================================================
-- 3. ENSURE RLS IS ENABLED
-- ================================================

ALTER TABLE invitation_codes ENABLE ROW LEVEL SECURITY;

-- ================================================
-- 4. VERIFY UPDATED_AT TRIGGER EXISTS
-- ================================================

-- Check if trigger function exists, create if not
CREATE OR REPLACE FUNCTION update_invitation_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger to ensure it's current
DROP TRIGGER IF EXISTS update_invitation_codes_updated_at_trigger ON invitation_codes;

CREATE TRIGGER update_invitation_codes_updated_at_trigger
  BEFORE UPDATE ON invitation_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_invitation_codes_updated_at();

COMMIT;

-- ================================================
-- NOTES
-- ================================================
-- Service role key (used by admin client) automatically bypasses RLS
-- These policies apply only to regular authenticated users
-- Backend enforces additional business logic (quotas, membership levels, etc.)
-- ================================================

