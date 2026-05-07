-- Wine search: pg_trgm + GIN indexes + RPC for /api/menu-search
--
-- NOTE: CREATE INDEX CONCURRENTLY cannot run inside Supabase's default transactional migration.
-- These use standard CREATE INDEX IF NOT EXISTS. For very large tables, consider creating
-- equivalent CONCURRENTLY indexes manually in the SQL editor during a maintenance window.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_menu_extracted_rows_producer_trgm
  ON menu_extracted_rows USING gin (producer gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_menu_extracted_rows_wine_name_trgm
  ON menu_extracted_rows USING gin (wine_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_menu_extracted_rows_region_trgm
  ON menu_extracted_rows USING gin (region gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_menu_extracted_rows_price_bottle
  ON menu_extracted_rows (price_bottle)
  WHERE price_bottle IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Count matching wine rows (same filters as search_menu_wines)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION count_search_menu_wines(
  p_query TEXT,
  p_city TEXT DEFAULT 'stockholm',
  p_min_price INTEGER DEFAULT NULL,
  p_max_price INTEGER DEFAULT NULL,
  p_wine_type TEXT DEFAULT NULL,
  p_by_glass BOOLEAN DEFAULT FALSE
)
RETURNS BIGINT
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::bigint
  FROM menu_extracted_rows mer
  JOIN menu_documents md ON mer.document_id = md.id
  JOIN starwinelist_sources ss ON md.source_slug = ss.slug
  WHERE ss.city = p_city
    AND md.extraction_status = 'completed'
    AND mer.needs_review = false
    AND mer.row_type = 'wine_row'
    AND (
      mer.producer ILIKE '%' || p_query || '%'
      OR mer.wine_name ILIKE '%' || p_query || '%'
      OR mer.region ILIKE '%' || p_query || '%'
      OR similarity(COALESCE(mer.producer, ''), p_query) > 0.25
      OR similarity(COALESCE(mer.wine_name, ''), p_query) > 0.25
      OR similarity(COALESCE(mer.region, ''), p_query) > 0.25
    )
    AND (p_min_price IS NULL OR mer.price_bottle >= p_min_price)
    AND (p_max_price IS NULL OR mer.price_bottle <= p_max_price)
    AND (p_wine_type IS NULL OR mer.wine_type = p_wine_type)
    AND (p_by_glass = FALSE OR mer.price_glass IS NOT NULL);
$$;

-- ---------------------------------------------------------------------------
-- Paginated search rows (group by venue in application layer)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION search_menu_wines(
  p_query TEXT,
  p_city TEXT DEFAULT 'stockholm',
  p_min_price INTEGER DEFAULT NULL,
  p_max_price INTEGER DEFAULT NULL,
  p_wine_type TEXT DEFAULT NULL,
  p_by_glass BOOLEAN DEFAULT FALSE,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  row_id UUID,
  producer TEXT,
  wine_name TEXT,
  vintage TEXT,
  region TEXT,
  country TEXT,
  wine_type TEXT,
  price_bottle NUMERIC,
  price_glass NUMERIC,
  currency TEXT,
  confidence NUMERIC,
  source_slug TEXT,
  venue_name TEXT,
  extracted_at TIMESTAMPTZ,
  match_score NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    mer.id AS row_id,
    mer.producer,
    mer.wine_name,
    mer.vintage,
    mer.region,
    mer.country,
    mer.wine_type,
    mer.price_bottle,
    mer.price_glass,
    mer.currency,
    mer.confidence,
    md.source_slug,
    ss.name AS venue_name,
    md.extracted_at AS extracted_at,
    GREATEST(
      similarity(COALESCE(mer.producer, ''), p_query),
      similarity(COALESCE(mer.wine_name, ''), p_query),
      similarity(COALESCE(mer.region, ''), p_query)
    ) AS match_score
  FROM menu_extracted_rows mer
  JOIN menu_documents md ON mer.document_id = md.id
  JOIN starwinelist_sources ss ON md.source_slug = ss.slug
  WHERE ss.city = p_city
    AND md.extraction_status = 'completed'
    AND mer.needs_review = false
    AND mer.row_type = 'wine_row'
    AND (
      mer.producer ILIKE '%' || p_query || '%'
      OR mer.wine_name ILIKE '%' || p_query || '%'
      OR mer.region ILIKE '%' || p_query || '%'
      OR similarity(COALESCE(mer.producer, ''), p_query) > 0.25
      OR similarity(COALESCE(mer.wine_name, ''), p_query) > 0.25
      OR similarity(COALESCE(mer.region, ''), p_query) > 0.25
    )
    AND (p_min_price IS NULL OR mer.price_bottle >= p_min_price)
    AND (p_max_price IS NULL OR mer.price_bottle <= p_max_price)
    AND (p_wine_type IS NULL OR mer.wine_type = p_wine_type)
    AND (p_by_glass = FALSE OR mer.price_glass IS NOT NULL)
  ORDER BY match_score DESC, mer.price_bottle ASC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
$$;

REVOKE EXECUTE ON FUNCTION count_search_menu_wines(TEXT, TEXT, INTEGER, INTEGER, TEXT, BOOLEAN) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION search_menu_wines(TEXT, TEXT, INTEGER, INTEGER, TEXT, BOOLEAN, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION count_search_menu_wines(TEXT, TEXT, INTEGER, INTEGER, TEXT, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION search_menu_wines(TEXT, TEXT, INTEGER, INTEGER, TEXT, BOOLEAN, INTEGER, INTEGER) TO service_role;

COMMENT ON FUNCTION search_menu_wines IS 'Fuzzy + ILIKE wine row search for menu extraction (public wine search API).';
COMMENT ON FUNCTION count_search_menu_wines IS 'Row count for search_menu_wines with identical filters.';
