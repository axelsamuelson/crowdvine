-- Check if invitation codes contain spaces
SELECT 
  code,
  LENGTH(code) as code_length,
  LENGTH(TRIM(code)) as trimmed_length,
  code LIKE '% %' as has_space_in_middle,
  code != TRIM(code) as has_leading_trailing_space,
  POSITION(' ' IN code) as space_position,
  created_at
FROM invitation_codes
ORDER BY created_at DESC
LIMIT 10;
