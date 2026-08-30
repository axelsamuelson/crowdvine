-- Migration 201: Systembolaget product mirror + editorial curation for guide pages.
-- Idempotent. Sync rewrites systembolaget_products weekly; curated rows are independent.

-- ============================================
-- 1. systembolaget_products (API mirror)
-- ============================================
CREATE TABLE IF NOT EXISTS systembolaget_products (
  product_number text PRIMARY KEY,
  product_id text,
  name_bold text,
  name_thin text,
  producer_name text,
  supplier_name text,
  category_level_1 text,
  category_level_2 text,
  country text,
  origin_level_1 text,
  origin_level_2 text,
  vintage integer,
  price numeric,
  volume integer,
  alcohol_percentage numeric,
  grapes text[],
  assortment text,
  assortment_text text,
  is_organic boolean NOT NULL DEFAULT false,
  is_sustainable boolean NOT NULL DEFAULT false,
  is_discontinued boolean NOT NULL DEFAULT false,
  is_completely_out_of_stock boolean NOT NULL DEFAULT false,
  is_temporary_out_of_stock boolean NOT NULL DEFAULT false,
  is_supplier_temporary_not_available boolean NOT NULL DEFAULT false,
  product_launch_date timestamptz,
  image_url text,
  raw jsonb,
  synced_at timestamptz NOT NULL DEFAULT now(),
  is_available boolean GENERATED ALWAYS AS (
    NOT (
      is_discontinued
      OR is_completely_out_of_stock
      OR is_temporary_out_of_stock
      OR is_supplier_temporary_not_available
    )
  ) STORED
);

COMMENT ON TABLE systembolaget_products IS
  'Mirror of Systembolaget e-commerce API. Rewritten weekly by /api/cron/systembolaget-sync. Never edit by hand.';

CREATE INDEX IF NOT EXISTS idx_sb_products_producer
  ON systembolaget_products (lower(producer_name));

CREATE INDEX IF NOT EXISTS idx_sb_products_category
  ON systembolaget_products (category_level_2);

CREATE INDEX IF NOT EXISTS idx_sb_products_available
  ON systembolaget_products (is_available)
  WHERE is_available;

CREATE INDEX IF NOT EXISTS idx_sb_products_price
  ON systembolaget_products (price);

-- Staging table for atomic replace (same columns as products, excluding generated is_available)
CREATE TABLE IF NOT EXISTS systembolaget_products_staging (
  product_number text PRIMARY KEY,
  product_id text,
  name_bold text,
  name_thin text,
  producer_name text,
  supplier_name text,
  category_level_1 text,
  category_level_2 text,
  country text,
  origin_level_1 text,
  origin_level_2 text,
  vintage integer,
  price numeric,
  volume integer,
  alcohol_percentage numeric,
  grapes text[],
  assortment text,
  assortment_text text,
  is_organic boolean NOT NULL DEFAULT false,
  is_sustainable boolean NOT NULL DEFAULT false,
  is_discontinued boolean NOT NULL DEFAULT false,
  is_completely_out_of_stock boolean NOT NULL DEFAULT false,
  is_temporary_out_of_stock boolean NOT NULL DEFAULT false,
  is_supplier_temporary_not_available boolean NOT NULL DEFAULT false,
  product_launch_date timestamptz,
  image_url text,
  raw jsonb,
  synced_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE systembolaget_products_staging IS
  'Temporary load target for Systembolaget sync. Promoted atomically into systembolaget_products.';

-- Guard: CREATE TABLE ... LIKE copies GENERATED columns as plain NULLable cols.
-- Staging must never carry is_available — it is computed only on promote into products.
ALTER TABLE systembolaget_products_staging
  DROP COLUMN IF EXISTS is_available;

-- ============================================
-- 2. Atomic promote: DELETE + INSERT in one transaction
-- ============================================
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
  SELECT count(*) INTO staged_count FROM systembolaget_products_staging;
  IF staged_count = 0 THEN
    RAISE EXCEPTION 'Refusing to promote: staging table is empty';
  END IF;

  -- WHERE true: some environments reject unqualified DELETE (error 21000).
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

-- ============================================
-- 3. systembolaget_curated (editorial layer)
-- ============================================
CREATE TABLE IF NOT EXISTS systembolaget_curated (
  id serial PRIMARY KEY,
  product_number text NOT NULL UNIQUE,
  verdict text NOT NULL,
  category text NOT NULL,
  editorial_note_sv text NOT NULL,
  editorial_note_en text,
  producer_note_sv text,
  producer_note_en text,
  sort_order integer NOT NULL DEFAULT 100,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT systembolaget_curated_verdict_check
    CHECK (verdict IN ('recommended', 'avoid')),
  CONSTRAINT systembolaget_curated_category_check
    CHECK (category IN ('red', 'white', 'orange', 'sparkling', 'rose', 'budget'))
);

COMMENT ON TABLE systembolaget_curated IS
  'PACT editorial curation of Systembolaget wines. Independent — PACT does not sell at Systembolaget. Joined against systembolaget_products at render time so unavailable wines drop out automatically.';

CREATE INDEX IF NOT EXISTS idx_sb_curated_category
  ON systembolaget_curated (category, sort_order)
  WHERE is_published;

CREATE OR REPLACE FUNCTION set_systembolaget_curated_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_systembolaget_curated_updated_at ON systembolaget_curated;
CREATE TRIGGER trg_systembolaget_curated_updated_at
  BEFORE UPDATE ON systembolaget_curated
  FOR EACH ROW
  EXECUTE FUNCTION set_systembolaget_curated_updated_at();

-- ============================================
-- 4. Guide view
-- ============================================
CREATE OR REPLACE VIEW systembolaget_guide_wines
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
  c.sort_order,
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
GRANT SELECT ON systembolaget_products TO anon, authenticated;
GRANT SELECT ON systembolaget_curated TO anon, authenticated;

-- ============================================
-- 5. RLS
-- ============================================
ALTER TABLE systembolaget_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE systembolaget_products_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE systembolaget_curated ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "systembolaget_products_select_public" ON systembolaget_products;
CREATE POLICY "systembolaget_products_select_public"
  ON systembolaget_products
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "systembolaget_curated_select_published" ON systembolaget_curated;
CREATE POLICY "systembolaget_curated_select_published"
  ON systembolaget_curated
  FOR SELECT
  USING (is_published = true);

-- Staging: no public policies (service role only)
-- Writes on products/curated: service role only (no write policies)
