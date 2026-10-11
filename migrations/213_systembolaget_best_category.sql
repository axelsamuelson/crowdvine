-- Migration 213: Parent "best" category for the cross-style Systembolaget list.
-- Idempotent. Seeds the ten parent-list rows and publishes them.

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
    'best'::text
  ]));

-- Copy editorial fields from the primary-category row. Do not rewrite copy.
INSERT INTO systembolaget_curated (
  product_number,
  verdict,
  category,
  editorial_note_sv,
  editorial_note_en,
  producer_note_sv,
  producer_note_en,
  top_100_producer_name,
  sort_order,
  is_published
)
SELECT
  src.product_number,
  'recommended',
  'best',
  src.editorial_note_sv,
  src.editorial_note_en,
  src.producer_note_sv,
  src.producer_note_en,
  src.top_100_producer_name,
  seed.sort_order,
  true
FROM (
  VALUES
    (1, '9348401', 'red'),
    (2, '9287501', 'red'),
    (3, '7328302', 'orange'),
    (4, '9469401', 'red'),
    (5, '9112801', 'rose'),
    (6, '551401', 'white'),
    (7, '9035301', 'white'),
    (8, '7183401', 'sparkling'),
    (9, '2011001', 'budget'),
    (10, '5924801', 'orange')
) AS seed(sort_order, product_number, source_category)
JOIN systembolaget_curated src
  ON src.product_number = seed.product_number
 AND src.category = seed.source_category
ON CONFLICT (product_number, category) DO NOTHING;

-- Rows inserted earlier as drafts are published here. Does not touch other categories.
UPDATE systembolaget_curated
SET is_published = true,
    first_published_at = COALESCE(first_published_at, now())
WHERE category = 'best'
  AND is_published = false;
