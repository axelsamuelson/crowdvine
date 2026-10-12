-- Soft retention for Systembolaget products: upsert + last_seen_at / consecutive_misses.
-- Replaces wipe-all promote. Idempotent.

ALTER TABLE systembolaget_products
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS consecutive_misses integer NOT NULL DEFAULT 0;

ALTER TABLE systembolaget_products_staging
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS consecutive_misses integer NOT NULL DEFAULT 0;

UPDATE systembolaget_products
SET
  last_seen_at = COALESCE(last_seen_at, synced_at, now()),
  consecutive_misses = COALESCE(consecutive_misses, 0)
WHERE last_seen_at IS NULL;

COMMENT ON COLUMN systembolaget_products.last_seen_at IS
  'When this product was last returned by a successful Systembolaget sync walk.';
COMMENT ON COLUMN systembolaget_products.consecutive_misses IS
  'How many successful syncs in a row did not see this product. Soft-unavailable at >= 3.';

-- Views depend on availability_state; drop and recreate after regenerating columns.
DROP VIEW IF EXISTS systembolaget_recommendation_wines;
DROP VIEW IF EXISTS systembolaget_guide_wines;

ALTER TABLE systembolaget_products DROP COLUMN IF EXISTS is_available;
ALTER TABLE systembolaget_products
  ADD COLUMN is_available boolean GENERATED ALWAYS AS (
    consecutive_misses < 3
    AND NOT (
      is_discontinued
      OR is_completely_out_of_stock
      OR is_temporary_out_of_stock
      OR is_supplier_temporary_not_available
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_sb_products_available
  ON systembolaget_products (is_available)
  WHERE is_available;

ALTER TABLE systembolaget_products DROP COLUMN IF EXISTS availability_state;
ALTER TABLE systembolaget_products
  ADD COLUMN availability_state text GENERATED ALWAYS AS (
    CASE
      WHEN consecutive_misses >= 3 THEN 'unavailable'
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
  'available | limited | unavailable. consecutive_misses >= 3 forces unavailable. limited = supplier-temp-not-available with store_count > 0.';

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
  p.store_count
FROM systembolaget_curated c
JOIN systembolaget_products p USING (product_number)
WHERE c.is_published = true
  AND c.verdict = ANY (ARRAY['recommended'::text, 'avoid'::text])
  AND p.availability_state = ANY (ARRAY['available'::text, 'limited'::text]);

CREATE OR REPLACE VIEW systembolaget_recommendation_wines AS
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
  AND p.availability_state = ANY (ARRAY['available'::text, 'limited'::text]);

GRANT SELECT ON systembolaget_guide_wines TO anon, authenticated;
GRANT SELECT ON systembolaget_recommendation_wines TO anon, authenticated;

DROP FUNCTION IF EXISTS public.systembolaget_promote_products();
DROP FUNCTION IF EXISTS public.systembolaget_promote_products(text[]);

CREATE OR REPLACE FUNCTION public.systembolaget_promote_products(
  p_protected_producer_names text[] DEFAULT ARRAY[]::text[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  upserted integer;
  staged_count integer;
BEGIN
  SET LOCAL statement_timeout = '120s';

  SELECT count(*) INTO staged_count FROM systembolaget_products_staging;
  IF staged_count = 0 THEN
    RAISE EXCEPTION 'Refusing to promote: staging table is empty';
  END IF;

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
    store_count,
    last_seen_at,
    consecutive_misses
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
    store_count,
    now(),
    0
  FROM systembolaget_products_staging
  ON CONFLICT (product_number) DO UPDATE SET
    product_id = EXCLUDED.product_id,
    name_bold = EXCLUDED.name_bold,
    name_thin = EXCLUDED.name_thin,
    producer_name = EXCLUDED.producer_name,
    supplier_name = EXCLUDED.supplier_name,
    category_level_1 = EXCLUDED.category_level_1,
    category_level_2 = EXCLUDED.category_level_2,
    country = EXCLUDED.country,
    origin_level_1 = EXCLUDED.origin_level_1,
    origin_level_2 = EXCLUDED.origin_level_2,
    vintage = EXCLUDED.vintage,
    price = EXCLUDED.price,
    volume = EXCLUDED.volume,
    alcohol_percentage = EXCLUDED.alcohol_percentage,
    grapes = EXCLUDED.grapes,
    assortment = EXCLUDED.assortment,
    assortment_text = EXCLUDED.assortment_text,
    is_organic = EXCLUDED.is_organic,
    is_sustainable = EXCLUDED.is_sustainable,
    is_discontinued = EXCLUDED.is_discontinued,
    is_completely_out_of_stock = EXCLUDED.is_completely_out_of_stock,
    is_temporary_out_of_stock = EXCLUDED.is_temporary_out_of_stock,
    is_supplier_temporary_not_available = EXCLUDED.is_supplier_temporary_not_available,
    product_launch_date = EXCLUDED.product_launch_date,
    image_url = EXCLUDED.image_url,
    raw = COALESCE(EXCLUDED.raw, systembolaget_products.raw),
    synced_at = EXCLUDED.synced_at,
    store_count = EXCLUDED.store_count,
    last_seen_at = now(),
    consecutive_misses = 0;

  GET DIAGNOSTICS upserted = ROW_COUNT;

  UPDATE systembolaget_products p
  SET consecutive_misses = p.consecutive_misses + 1
  WHERE NOT EXISTS (
    SELECT 1
    FROM systembolaget_products_staging s
    WHERE s.product_number = p.product_number
  );

  DELETE FROM systembolaget_products p
  WHERE p.last_seen_at < now() - interval '30 days'
    AND p.consecutive_misses >= 3
    AND NOT EXISTS (
      SELECT 1
      FROM systembolaget_curated c
      WHERE c.product_number = p.product_number
    )
    AND (
      p.producer_name IS NULL
      OR NOT (p.producer_name = ANY (p_protected_producer_names))
    );

  DELETE FROM systembolaget_products_staging WHERE true;

  RETURN upserted;
END;
$function$;

REVOKE ALL ON FUNCTION public.systembolaget_promote_products(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.systembolaget_promote_products(text[]) TO service_role;
