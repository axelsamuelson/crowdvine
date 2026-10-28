-- Migration 236: Allow curated category "new" (new and upcoming releases).
-- Idempotent. Mirrors the production migration systembolaget_new_releases_category.
-- Does not insert or publish rows.

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
    'petnat'::text,
    'new'::text
  ]));

-- New columns must always be appended LAST. CREATE OR REPLACE VIEW can add
-- columns at the end, but it cannot insert, drop or reorder existing ones.
CREATE OR REPLACE VIEW systembolaget_guide_wines AS
SELECT
  c.id,
  c.product_number,
  c.verdict,
  c.category,
  c.editorial_note_sv,
  c.editorial_note_en,
  c.producer_note_sv,
  c.producer_note_en,
  c.top_100_producer_name,
  c.sort_order,
  c.previous_sort_order,
  c.first_published_at,
  c.last_reviewed_at,
  CASE
    WHEN c.previous_sort_order IS NULL THEN 'new'::text
    WHEN c.sort_order < c.previous_sort_order THEN 'up'::text
    WHEN c.sort_order > c.previous_sort_order THEN 'down'::text
    ELSE 'unchanged'::text
  END AS rank_status,
  CASE
    WHEN c.previous_sort_order IS NULL THEN NULL::integer
    ELSE (c.previous_sort_order - c.sort_order)
  END AS rank_delta,
  p.name_bold,
  p.name_thin,
  p.producer_name,
  p.category_level_2,
  p.country,
  p.origin_level_1,
  p.vintage,
  p.price,
  p.volume,
  p.alcohol_percentage,
  p.grapes,
  p.assortment_text,
  p.is_organic,
  p.image_url,
  p.synced_at,
  p.availability_state,
  p.store_count,
  c.wine_score,
  c.score_adjust,
  p.product_launch_date
FROM systembolaget_curated c
JOIN systembolaget_products p USING (product_number)
WHERE c.is_published = true
  AND c.verdict = ANY (ARRAY['recommended'::text, 'avoid'::text])
  AND p.availability_state = ANY (ARRAY['available'::text, 'limited'::text]);

COMMENT ON VIEW systembolaget_guide_wines IS
  'Published recommended/avoid wines that are available or limited. product_launch_date is last so later CREATE OR REPLACE can keep appending columns.';

GRANT SELECT ON systembolaget_guide_wines TO anon, authenticated;
