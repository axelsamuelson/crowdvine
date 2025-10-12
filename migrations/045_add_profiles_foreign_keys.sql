-- Migration 045: Add Foreign Key constraints from bookings and order_reservations to profiles
-- This enables Supabase to automatically join profiles data using the profiles() syntax

-- Step 1: Check if foreign keys already exist and drop them if needed
DO $$ 
BEGIN
    -- Drop existing FK if it exists (in case of re-running migration)
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'bookings_user_id_profiles_fkey'
    ) THEN
        ALTER TABLE bookings DROP CONSTRAINT bookings_user_id_profiles_fkey;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'order_reservations_user_id_profiles_fkey'
    ) THEN
        ALTER TABLE order_reservations DROP CONSTRAINT order_reservations_user_id_profiles_fkey;
    END IF;
END $$;

-- Step 2: Ensure all user_ids in bookings exist in profiles
-- (Clean up any orphaned records first)
DELETE FROM bookings 
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT id FROM profiles);

DELETE FROM order_reservations 
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT id FROM profiles);

-- Step 3: Add Foreign Key constraints
-- This allows Supabase to automatically resolve profiles() joins

ALTER TABLE bookings
ADD CONSTRAINT bookings_user_id_profiles_fkey
FOREIGN KEY (user_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;

ALTER TABLE order_reservations
ADD CONSTRAINT order_reservations_user_id_profiles_fkey
FOREIGN KEY (user_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;

-- Step 4: Create indexes for better join performance
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_order_reservations_user_id ON order_reservations(user_id);

-- Verification query (optional, for testing)
-- SELECT 
--   'bookings' as table_name,
--   constraint_name,
--   constraint_type
-- FROM information_schema.table_constraints
-- WHERE table_name = 'bookings' AND constraint_type = 'FOREIGN KEY'
-- UNION ALL
-- SELECT 
--   'order_reservations' as table_name,
--   constraint_name,
--   constraint_type
-- FROM information_schema.table_constraints
-- WHERE table_name = 'order_reservations' AND constraint_type = 'FOREIGN KEY';

