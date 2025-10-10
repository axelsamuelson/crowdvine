-- Verify Invitation Codes for Spaces
-- Run this in Supabase SQL Editor to check if any codes have spaces

-- 1. Check if any codes contain spaces
SELECT 
  'Codes with spaces' as check_type,
  COUNT(*) as count
FROM invitation_codes
WHERE code LIKE '% %' OR code != TRIM(code);

-- 2. List all codes with detailed analysis
SELECT 
  id,
  code,
  LENGTH(code) as code_length,
  LENGTH(TRIM(code)) as trimmed_length,
  code LIKE '% %' as has_space_in_middle,
  code != TRIM(code) as has_leading_trailing_space,
  POSITION(' ' IN code) as first_space_position,
  created_at,
  is_active,
  used_at IS NULL as is_unused
FROM invitation_codes
ORDER BY created_at DESC
LIMIT 20;

-- 3. Find specific code if needed (replace with actual code)
-- SELECT * FROM invitation_codes WHERE code = '8UPYUAMCC29C';

-- 4. If you need to fix codes with spaces (UNCOMMENT TO RUN):
-- UPDATE invitation_codes
-- SET code = REPLACE(TRIM(code), ' ', '')
-- WHERE code LIKE '% %' OR code != TRIM(code);

