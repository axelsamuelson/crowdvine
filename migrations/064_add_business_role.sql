-- Migration 064: Add 'business' role to profiles table
-- This allows B2B users (restaurants, bars, etc.) to have a distinct role

-- Step 1: Drop the existing CHECK constraint on role column if it exists
DO $$ 
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find the constraint name (could be profiles_role_check or auto-generated)
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'profiles'::regclass
    AND contype = 'c'
    AND (
        pg_get_constraintdef(oid) LIKE '%role%IN%' 
        OR conname LIKE '%role%check%'
        OR conname = 'profiles_role_check'
    )
    LIMIT 1;
    
    -- Drop it if it exists (without IF EXISTS since we check first)
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE profiles DROP CONSTRAINT %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END IF;
END $$;

-- Step 2: Add new CHECK constraint that includes 'business' role
ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('user', 'producer', 'admin', 'business'));

-- Step 3: Add comment to document the business role
COMMENT ON COLUMN profiles.role IS 'User role: user (regular consumer), producer (wine producer), admin (platform admin), business (B2B: restaurants, bars, etc.)';
