-- Migration 207: Resolve {{rank}} tokens in producer notes via TOP_100_PRODUCERS key.
-- Idempotent. No FK — TOP_100_PRODUCERS lives in application code.

-- ============================================
-- 1. Column on curated
-- ============================================
ALTER TABLE systembolaget_curated
  ADD COLUMN IF NOT EXISTS top_100_producer_name text;

COMMENT ON COLUMN systembolaget_curated.top_100_producer_name IS
  'Exact name as it appears in TOP_100_PRODUCERS (lib/guides/top-100-producers.ts). Used to resolve {{rank}} tokens in producer_note_* at render time. NULL means this wine is not by a top-100 producer.';

-- ============================================
-- 2. Backfill five rows with tokenized notes
--    Verified exact matches in TOP_100_PRODUCERS:
--      Marcel Lapierre → #12
--      Frank Cornelissen → #13
--      Radikon → #8
-- ============================================
UPDATE systembolaget_curated
SET
  top_100_producer_name = 'Marcel Lapierre',
  producer_note_sv = 'Rankad {{rank}} på vår lista över världens 100 bästa naturvinsproducenter.',
  producer_note_en = 'Ranked {{rank}} on our list of the world''s 100 best natural wine producers.',
  updated_at = now()
WHERE id = 18;

UPDATE systembolaget_curated
SET
  top_100_producer_name = 'Frank Cornelissen',
  producer_note_sv = 'Rankad {{rank}} på vår lista över världens 100 bästa naturvinsproducenter.',
  producer_note_en = 'Ranked {{rank}} on our list of the world''s 100 best natural wine producers.',
  updated_at = now()
WHERE id = 19;

UPDATE systembolaget_curated
SET
  top_100_producer_name = 'Radikon',
  producer_note_sv = 'Rankad {{rank}} på vår lista över världens 100 bästa naturvinsproducenter.',
  producer_note_en = 'Ranked {{rank}} on our list of the world''s 100 best natural wine producers.',
  updated_at = now()
WHERE id = 21;

UPDATE systembolaget_curated
SET
  top_100_producer_name = 'Radikon',
  producer_note_sv = 'Rankad {{rank}} på vår lista över världens 100 bästa naturvinsproducenter.',
  producer_note_en = 'Ranked {{rank}} on our list of the world''s 100 best natural wine producers.',
  updated_at = now()
WHERE id = 24;

UPDATE systembolaget_curated
SET
  top_100_producer_name = 'Frank Cornelissen',
  producer_note_sv = 'Rankad {{rank}} på vår lista över världens 100 bästa naturvinsproducenter.',
  producer_note_en = 'Ranked {{rank}} on our list of the world''s 100 best natural wine producers.',
  updated_at = now()
WHERE id = 34;

-- ============================================
-- 3. Recreate guide view (includes top_100_producer_name
--    and rank fields already present in production)
--
-- DROP + CREATE required: CREATE OR REPLACE cannot insert/reorder
-- columns mid-list (error 42P16 renaming sort_order → top_100_…).
-- ============================================
DROP VIEW IF EXISTS systembolaget_guide_wines;

CREATE VIEW systembolaget_guide_wines
WITH (security_invoker = true)
AS
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
    WHEN c.previous_sort_order IS NULL THEN 'new'
    WHEN c.sort_order < c.previous_sort_order THEN 'up'
    WHEN c.sort_order > c.previous_sort_order THEN 'down'
    ELSE 'unchanged'
  END AS rank_status,
  CASE
    WHEN c.previous_sort_order IS NULL THEN NULL
    ELSE c.previous_sort_order - c.sort_order
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
  p.synced_at
FROM systembolaget_curated c
JOIN systembolaget_products p USING (product_number)
WHERE c.is_published = true
  AND p.is_available = true;

COMMENT ON VIEW systembolaget_guide_wines IS
  'Published curated Systembolaget wines that are currently available. Guide pages render from this view.';

GRANT SELECT ON systembolaget_guide_wines TO anon, authenticated;
