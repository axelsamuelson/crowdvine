-- Migration 245: Set EU markets.age_minimum to Swedish retail floor (20).
-- US already seeds age_minimum=21 (migration 141). Checkout reads this on
-- client and server via resolveMarketAgeMinimum; null previously fell back
-- to country AGE_LIMITS only.

UPDATE markets
SET
  age_minimum = 20,
  updated_at = now()
WHERE code = 'EU'
  AND (age_minimum IS NULL OR age_minimum <> 20);
