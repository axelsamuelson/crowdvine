-- Reviewed but not listed: verdict skipped + optional reasons.
-- Idempotent. Live DB may already have these changes from a manual apply.

ALTER TABLE systembolaget_curated
  DROP CONSTRAINT IF EXISTS sb_curated_verdict_chk;

ALTER TABLE systembolaget_curated
  DROP CONSTRAINT IF EXISTS systembolaget_curated_verdict_check;

ALTER TABLE systembolaget_curated
  ADD CONSTRAINT sb_curated_verdict_chk
  CHECK (verdict = ANY (ARRAY['recommended'::text, 'avoid'::text, 'skipped'::text]));

ALTER TABLE systembolaget_curated
  ADD COLUMN IF NOT EXISTS skip_reason_sv text,
  ADD COLUMN IF NOT EXISTS skip_reason_en text;

COMMENT ON COLUMN systembolaget_curated.skip_reason_sv IS
  'Why a skipped wine was reviewed but not listed (Swedish).';
COMMENT ON COLUMN systembolaget_curated.skip_reason_en IS
  'Why a skipped wine was reviewed but not listed (English).';

-- Keep skipped out of public guide pages even if is_published was set.
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
  p.synced_at,
  p.availability_state,
  p.store_count
FROM systembolaget_curated c
JOIN systembolaget_products p USING (product_number)
WHERE c.is_published = true
  AND c.verdict IN ('recommended', 'avoid')
  AND p.availability_state IN ('available', 'limited');

COMMENT ON VIEW systembolaget_guide_wines IS
  'Published curated Systembolaget wines (recommended/avoid only) with availability_state available or limited.';

GRANT SELECT ON systembolaget_guide_wines TO anon, authenticated;
