-- Migration 204: Raise statement_timeout inside systembolaget_promote_products.
-- A full ~12k-row promote (with jsonb raw) exceeds the default statement timeout.

CREATE OR REPLACE FUNCTION systembolaget_promote_products()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    synced_at
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
    synced_at
  FROM systembolaget_products_staging;

  GET DIAGNOSTICS inserted = ROW_COUNT;

  DELETE FROM systembolaget_products_staging WHERE true;

  RETURN inserted;
END;
$$;

REVOKE ALL ON FUNCTION systembolaget_promote_products() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION systembolaget_promote_products() TO service_role;
