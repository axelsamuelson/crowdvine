-- ================================================
-- Delete All Data for axelrib@hotmail.com
-- ================================================
-- This script removes all data associated with axelrib@hotmail.com
-- Run this in Supabase SQL Editor
-- ================================================

BEGIN;

-- Get user ID first
DO $$
DECLARE
  target_user_id UUID;
  target_email TEXT := 'axelrib@hotmail.com';
BEGIN
  -- Find user ID from auth.users
  SELECT id INTO target_user_id 
  FROM auth.users 
  WHERE email = target_email;
  
  IF target_user_id IS NOT NULL THEN
    RAISE NOTICE 'Found user ID: %', target_user_id;
    
    -- Delete from user_memberships (if exists)
    DELETE FROM user_memberships WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted from user_memberships';
    
    -- Delete from profiles (if exists)
    DELETE FROM profiles WHERE id = target_user_id;
    RAISE NOTICE 'Deleted from profiles';
    
    -- Delete from impact_point_events (if exists)
    DELETE FROM impact_point_events WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted from impact_point_events';
    
    -- Delete from invitation_codes (created_by or used_by)
    DELETE FROM invitation_codes WHERE created_by = target_user_id OR used_by = target_user_id;
    RAISE NOTICE 'Deleted from invitation_codes';
    
    -- Delete from order_reservations (if exists)
    DELETE FROM order_reservations WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted from order_reservations';
    
    -- Delete from carts (if exists)
    DELETE FROM carts WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted from carts';
    
    -- Delete from user_addresses (if exists)
    DELETE FROM user_addresses WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted from user_addresses';
    
    RAISE NOTICE 'All related data deleted for user: %', target_user_id;
  ELSE
    RAISE NOTICE 'User % not found in auth.users', target_email;
  END IF;
END $$;

-- Delete from auth.users (this will cascade to any remaining references)
DELETE FROM auth.users WHERE email = 'axelrib@hotmail.com';

COMMIT;

-- Verification
SELECT 'Verification - Should return 0 rows:' as message;

SELECT 'auth.users' as table_name, COUNT(*) as count 
FROM auth.users WHERE email = 'axelrib@hotmail.com'
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles WHERE email = 'axelrib@hotmail.com'
UNION ALL
SELECT 'user_memberships', COUNT(*) 
FROM user_memberships um 
JOIN auth.users u ON u.id = um.user_id 
WHERE u.email = 'axelrib@hotmail.com';

-- Should all be 0

SELECT 'User axelrib@hotmail.com completely deleted' as result;

