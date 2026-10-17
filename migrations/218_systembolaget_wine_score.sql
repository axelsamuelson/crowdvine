-- Editorial wine score for curated Systembolaget lists.
-- sort_order stays as the fallback order and the tiebreak.

ALTER TABLE systembolaget_curated
  ADD COLUMN IF NOT EXISTS wine_score smallint,
  ADD COLUMN IF NOT EXISTS score_adjust smallint NOT NULL DEFAULT 0;

ALTER TABLE systembolaget_curated
  DROP CONSTRAINT IF EXISTS systembolaget_curated_wine_score_check;

ALTER TABLE systembolaget_curated
  ADD CONSTRAINT systembolaget_curated_wine_score_check
  CHECK (wine_score IS NULL OR (wine_score >= 0 AND wine_score <= 100));

COMMENT ON COLUMN systembolaget_curated.wine_score IS
  'Editorial wine score 0..100. Null keeps the row on sort_order.';
COMMENT ON COLUMN systembolaget_curated.score_adjust IS
  'Added to the blended score. Does not publish or hide the row.';

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
  c.score_adjust
FROM systembolaget_curated c
JOIN systembolaget_products p USING (product_number)
WHERE c.is_published = true
  AND c.verdict = ANY (ARRAY['recommended'::text, 'avoid'::text])
  AND p.availability_state = ANY (ARRAY['available'::text, 'limited'::text]);

GRANT SELECT ON systembolaget_guide_wines TO anon, authenticated;
