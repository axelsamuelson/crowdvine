-- Migration 211: Dual-category curation, glouglou, limited availability.
-- Idempotent. Does not loosen is_available (supplier flag stays in that expression).

-- ============================================
-- 1. UNIQUE (product_number, category) + glouglou
-- ============================================
ALTER TABLE systembolaget_curated
  DROP CONSTRAINT IF EXISTS systembolaget_curated_product_number_key;

ALTER TABLE systembolaget_curated
  DROP CONSTRAINT IF EXISTS systembolaget_curated_product_number_category_key;

ALTER TABLE systembolaget_curated
  ADD CONSTRAINT systembolaget_curated_product_number_category_key
  UNIQUE (product_number, category);

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
    'glouglou'::text
  ]));

-- ============================================
-- 2. Snapshot ranks (was DB-only; copy of live source)
-- ============================================
CREATE OR REPLACE FUNCTION public.systembolaget_snapshot_ranks(target_category text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  touched integer;
BEGIN
  UPDATE systembolaget_curated
  SET previous_sort_order = sort_order,
      last_reviewed_at    = now()
  WHERE category = target_category;

  GET DIAGNOSTICS touched = ROW_COUNT;
  RETURN touched;
END;
$function$;

REVOKE ALL ON FUNCTION public.systembolaget_snapshot_ranks(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.systembolaget_snapshot_ranks(text) TO service_role;

-- ============================================
-- 3. store_count + availability_state
-- ============================================
ALTER TABLE systembolaget_products
  ADD COLUMN IF NOT EXISTS store_count integer;

ALTER TABLE systembolaget_products_staging
  ADD COLUMN IF NOT EXISTS store_count integer;

COMMENT ON COLUMN systembolaget_products.store_count IS
  'availableNumberOfStores from the Systembolaget product page. Populated during sync for tracked supplier-flag wines; null otherwise.';

ALTER TABLE systembolaget_products
  DROP COLUMN IF EXISTS availability_state;

ALTER TABLE systembolaget_products
  ADD COLUMN availability_state text GENERATED ALWAYS AS (
    CASE
      WHEN is_discontinued
        OR is_completely_out_of_stock
        OR is_temporary_out_of_stock
        THEN 'unavailable'
      WHEN is_supplier_temporary_not_available THEN
        CASE
          WHEN store_count > 0 THEN 'limited'
          ELSE 'unavailable'
        END
      ELSE 'available'
    END
  ) STORED;

COMMENT ON COLUMN systembolaget_products.availability_state IS
  'available | limited | unavailable. limited = supplier-temp-not-available with store_count > 0. is_available is unchanged and still treats the supplier flag as unavailable.';

-- ============================================
-- 4. Promote: empty-staging guard, WHERE true deletes, store_count
-- ============================================
CREATE OR REPLACE FUNCTION public.systembolaget_promote_products()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  inserted integer;
  staged_count integer;
BEGIN
  SET LOCAL statement_timeout = '120s';

  SELECT count(*) INTO staged_count FROM systembolaget_products_staging;
  IF staged_count = 0 THEN
    RAISE EXCEPTION 'Refusing to promote: staging table is empty';
  END IF;

  DELETE FROM systembolaget_products WHERE true;

  INSERT INTO systembolaget_products (
    product_number,
    product_id,
    name_bold,
    name_thin,
    producer_name,
    supplier_name,
    category_level_1,
    category_level_2,
    country,
    origin_level_1,
    origin_level_2,
    vintage,
    price,
    volume,
    alcohol_percentage,
    grapes,
    assortment,
    assortment_text,
    is_organic,
    is_sustainable,
    is_discontinued,
    is_completely_out_of_stock,
    is_temporary_out_of_stock,
    is_supplier_temporary_not_available,
    product_launch_date,
    image_url,
    raw,
    synced_at,
    store_count
  )
  SELECT
    product_number,
    product_id,
    name_bold,
    name_thin,
    producer_name,
    supplier_name,
    category_level_1,
    category_level_2,
    country,
    origin_level_1,
    origin_level_2,
    vintage,
    price,
    volume,
    alcohol_percentage,
    grapes,
    assortment,
    assortment_text,
    is_organic,
    is_sustainable,
    is_discontinued,
    is_completely_out_of_stock,
    is_temporary_out_of_stock,
    is_supplier_temporary_not_available,
    product_launch_date,
    image_url,
    raw,
    synced_at,
    store_count
  FROM systembolaget_products_staging;

  GET DIAGNOSTICS inserted = ROW_COUNT;

  DELETE FROM systembolaget_products_staging WHERE true;

  RETURN inserted;
END;
$function$;

REVOKE ALL ON FUNCTION public.systembolaget_promote_products() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.systembolaget_promote_products() TO service_role;

-- ============================================
-- 5. Guide + recommendation views (available | limited)
-- ============================================
DROP VIEW IF EXISTS systembolaget_guide_wines;
DROP VIEW IF EXISTS systembolaget_recommendation_wines;

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
  AND p.availability_state IN ('available', 'limited');

COMMENT ON VIEW systembolaget_guide_wines IS
  'Published curated Systembolaget wines with availability_state available or limited. Guide pages render from this view.';

GRANT SELECT ON systembolaget_guide_wines TO anon, authenticated;

CREATE VIEW systembolaget_recommendation_wines
WITH (security_invoker = true)
AS
SELECT
  r.id,
  r.issue_year,
  r.issue_week,
  r.product_number,
  r.editorial_note_sv,
  r.editorial_note_en,
  r.sort_order,
  r.published_at,
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
FROM systembolaget_recommendations r
JOIN systembolaget_products p USING (product_number)
WHERE r.is_published = true
  AND p.availability_state IN ('available', 'limited');

COMMENT ON VIEW systembolaget_recommendation_wines IS
  'Published weekly-issue Systembolaget wines with availability_state available or limited.';

GRANT SELECT ON systembolaget_recommendation_wines TO anon, authenticated;
