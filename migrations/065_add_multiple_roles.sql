-- Migration 065: Add support for multiple roles per user
-- This allows users to have multiple roles (e.g., both 'user' and 'business')

-- Step 1: Add roles array column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT ARRAY['user']::TEXT[];

-- Step 2: Migrate existing role data to roles array
-- Copy the single role value into the roles array
UPDATE profiles
SET roles = ARRAY[role]::TEXT[]
WHERE roles IS NULL OR array_length(roles, 1) IS NULL;

-- Step 3: Ensure roles array is never null (set default for any nulls)
UPDATE profiles
SET roles = ARRAY['user']::TEXT[]
WHERE roles IS NULL;

-- Step 4: Drop existing constraint if it exists, then add new one
DO $$ 
BEGIN
    -- Drop the constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'profiles'::regclass 
        AND conname = 'profiles_roles_check'
    ) THEN
        ALTER TABLE profiles DROP CONSTRAINT profiles_roles_check;
        RAISE NOTICE 'Dropped existing profiles_roles_check constraint';
    END IF;
END $$;

-- Step 5: Add constraint to ensure roles array only contains valid role values
ALTER TABLE profiles
ADD CONSTRAINT profiles_roles_check 
CHECK (
  roles IS NOT NULL 
  AND array_length(roles, 1) > 0 
  AND roles <@ ARRAY['user', 'producer', 'admin', 'business']::TEXT[]
);

-- Step 6: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_roles ON profiles USING GIN (roles);

-- Step 7: Add helper function to check if user has a specific role
CREATE OR REPLACE FUNCTION user_has_role(user_id UUID, role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id
    AND role_name = ANY(roles)
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 8: Add comment to document the roles column
COMMENT ON COLUMN profiles.roles IS 'Array of user roles. Users can have multiple roles simultaneously (e.g., both user and business). Valid values: user, producer, admin, business';

-- Note: We keep the 'role' column for backward compatibility but roles array is the source of truth
