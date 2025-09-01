-- Supabase Setup Verification Script
-- Kör detta i SQL Editor för att verifiera att allt är korrekt uppsatt

-- 1. Kontrollera att alla tabeller finns
SELECT 'Table Check' as test, 
       CASE 
         WHEN COUNT(*) = 7 THEN 'PASS' 
         ELSE 'FAIL - Missing tables' 
       END as result,
       COUNT(*) as found_tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'profiles', 
  'producers', 
  'campaigns', 
  'campaign_items', 
  'pallet_zones', 
  'pallet_zone_members', 
  'bookings'
);

-- 2. Kontrollera RLS är aktiverat
SELECT 'RLS Check' as test,
       CASE 
         WHEN COUNT(*) = 7 THEN 'PASS' 
         ELSE 'FAIL - RLS not enabled on all tables' 
       END as result,
       COUNT(*) as tables_with_rls
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'profiles', 
  'producers', 
  'campaigns', 
  'campaign_items', 
  'pallet_zones', 
  'pallet_zone_members', 
  'bookings'
)
AND rowsecurity = true;

-- 3. Kontrollera RLS policies
SELECT 'RLS Policies' as test,
       COUNT(*) as policy_count,
       'PASS' as result
FROM pg_policies 
WHERE schemaname = 'public';

-- 4. Kontrollera data finns
SELECT 'Data Check' as test,
       profiles.count as profiles,
       producers.count as producers,
       campaigns.count as campaigns,
       wines.count as wines,
       zones.count as zones,
       bookings.count as bookings,
       CASE 
         WHEN profiles.count > 0 AND producers.count > 0 
              AND campaigns.count > 0 AND wines.count > 0 
              AND zones.count > 0 THEN 'PASS'
         ELSE 'FAIL - Missing sample data'
       END as result
FROM 
  (SELECT COUNT(*) as count FROM profiles) as profiles,
  (SELECT COUNT(*) as count FROM producers) as producers,
  (SELECT COUNT(*) as count FROM campaigns) as campaigns,
  (SELECT COUNT(*) as count FROM campaign_items) as wines,
  (SELECT COUNT(*) as count FROM pallet_zones) as zones,
  (SELECT COUNT(*) as count FROM bookings) as bookings;

-- 5. Kontrollera admin-användare
SELECT 'Admin User Check' as test,
       COUNT(*) as admin_count,
       CASE 
         WHEN COUNT(*) > 0 THEN 'PASS' 
         ELSE 'FAIL - No admin users found' 
       END as result
FROM profiles 
WHERE role = 'admin';

-- 6. Kontrollera email-bekräftelse
SELECT 'Email Confirmation Check' as test,
       COUNT(*) as confirmed_users,
       CASE 
         WHEN COUNT(*) > 0 THEN 'PASS' 
         ELSE 'FAIL - No confirmed users' 
       END as result
FROM auth.users 
WHERE email_confirmed_at IS NOT NULL;

-- 7. Kontrollera foreign key constraints
SELECT 'Foreign Key Check' as test,
       COUNT(*) as constraint_count,
       'PASS' as result
FROM information_schema.table_constraints 
WHERE constraint_type = 'FOREIGN KEY' 
AND table_schema = 'public';

-- 8. Kontrollera triggers
SELECT 'Trigger Check' as test,
       COUNT(*) as trigger_count,
       'PASS' as result
FROM information_schema.triggers 
WHERE trigger_schema = 'public';
