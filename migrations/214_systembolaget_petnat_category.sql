-- Migration 214: Allow curated category petnat.
-- Idempotent. Does not insert or publish rows.
-- UNIQUE (product_number, category) is left in place.

ALTER TABLE systembolaget_curated
  DROP CONSTRAINT IF EXISTS sb_curated_category_chk;

ALTER TABLE systembolaget_curated
  DROP CONSTRAINT IF EXISTS systembolaget_curated_category_check;

ALTER TABLE systembolaget_curated
  ADD CONSTRAINT sb_curated_category_chk
  CHECK (category = ANY (ARRAY[
    'red'::text,
    'white'::text,
    'orange'::text,
    'sparkling'::text,
    'rose'::text,
    'budget'::text,
    'glouglou'::text,
    'best'::text,
    'petnat'::text
  ]));
