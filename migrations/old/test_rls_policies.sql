-- Test RLS-policies för autentiserad användare
-- Kör detta i Supabase SQL Editor för att testa

-- Test 1: Kontrollera RLS-policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'site_content';

-- Test 2: Testa att uppdatera som autentiserad användare
-- (Detta kommer att simulera vad som händer när admin-panelen försöker uppdatera)
UPDATE site_content 
SET value = 'test_update_from_admin', updated_at = NOW()
WHERE key = 'header_logo';

-- Test 3: Kontrollera att uppdateringen fungerade
SELECT * FROM site_content WHERE key = 'header_logo';

-- Test 4: Testa att lägga till en ny post som autentiserad användare
INSERT INTO site_content (key, value, type, description) 
VALUES ('test_admin_key', 'test_admin_value', 'text', 'Test from admin')
ON CONFLICT (key) DO NOTHING;

-- Test 5: Kontrollera att insert fungerade
SELECT * FROM site_content WHERE key = 'test_admin_key';

-- Test 6: Ta bort test-posten
DELETE FROM site_content WHERE key = 'test_admin_key';
