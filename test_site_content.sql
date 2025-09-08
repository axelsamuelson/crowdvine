-- Test script för att kontrollera site_content tabellen
-- Kör detta i Supabase SQL Editor för att testa

-- Test 1: Kontrollera att tabellen finns
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'site_content';

-- Test 2: Kontrollera att data finns
SELECT * FROM site_content LIMIT 5;

-- Test 3: Testa att lägga till en test-post
INSERT INTO site_content (key, value, type, description) 
VALUES ('test_key', 'test_value', 'text', 'Test description')
ON CONFLICT (key) DO NOTHING;

-- Test 4: Kontrollera RLS-policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'site_content';

-- Test 5: Testa att uppdatera en post
UPDATE site_content 
SET value = 'updated_test_value', updated_at = NOW()
WHERE key = 'test_key';

-- Test 6: Kontrollera att uppdateringen fungerade
SELECT * FROM site_content WHERE key = 'test_key';

-- Test 7: Ta bort test-posten
DELETE FROM site_content WHERE key = 'test_key';
