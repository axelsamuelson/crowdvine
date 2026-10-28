-- Migration 237: Shrink-guard baseline and batched promote.
-- old_count stays the guard baseline (rows with consecutive_misses = 0).
-- mirror_total is the full systembolaget_products count, including rows
-- kept for 30 days after they disappear.
-- Promote accepts a product_number range so each call stays inside the
-- caller's statement_timeout. SET LOCAL inside the function does not
-- extend that calling statement.

ALTER TABLE systembolaget_sync_log
  ADD COLUMN IF NOT EXISTS mirror_total integer;

COMMENT ON COLUMN systembolaget_sync_log.old_count IS
  'Shrink-guard baseline: count of systembolaget_products where consecutive_misses = 0 (rows seen in the latest successful sync).';
COMMENT ON COLUMN systembolaget_sync_log.mirror_total IS
  'Total rows in systembolaget_products, including rows retained after they disappear. Nullable on runs from before this column existed.';

DROP FUNCTION IF EXISTS public.systembolaget_promote_products(text[]);
DROP FUNCTION IF EXISTS public.systembolaget_promote_products(text[], text, text, boolean);

CREATE FUNCTION public.systembolaget_promote_products(
  p_protected_producer_names text[] DEFAULT ARRAY[]::text[],
  p_product_number_gte text DEFAULT NULL,
  p_product_number_lt text DEFAULT NULL,
  p_finalize boolean DEFAULT true
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
  -- Only affects later statements inside this function. It does not extend
  -- the timeout of the statement that called the function (authenticator
  -- is 8s). The cron therefore calls this once per product_number batch.
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
  WHERE (p_product_number_gte IS NULL OR product_number >= p_product_number_gte)
    AND (p_product_number_lt IS NULL OR product_number < p_product_number_lt)
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

  IF p_finalize THEN
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
  END IF;

  RETURN upserted;
END;
$function$;

REVOKE ALL ON FUNCTION public.systembolaget_promote_products(text[], text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.systembolaget_promote_products(text[], text, text, boolean) TO service_role;

NOTIFY pgrst, 'reload schema';
