-- Browse mode: empty p_query returns all wine rows (same filters), ordered by newest menu first, then producer, wine.
-- Search mode: non-empty p_query keeps existing text + similarity filters and match_score / price ordering.

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
      length(trim(coalesce(p_query, ''))) = 0
      OR (
        mer.producer ILIKE '%' || p_query || '%'
        OR mer.wine_name ILIKE '%' || p_query || '%'
        OR mer.region ILIKE '%' || p_query || '%'
        OR similarity(COALESCE(mer.producer, ''), p_query) > 0.25
        OR similarity(COALESCE(mer.wine_name, ''), p_query) > 0.25
      )
    )
    AND (p_min_price IS NULL OR mer.price_bottle >= p_min_price)
    AND (p_max_price IS NULL OR mer.price_bottle <= p_max_price)
    AND (p_wine_type IS NULL OR mer.wine_type = p_wine_type)
    AND (p_by_glass = FALSE OR mer.price_glass IS NOT NULL);
$$;

DROP FUNCTION IF EXISTS search_menu_wines(
  text,
  text,
  integer,
  integer,
  text,
  boolean,
  integer,
  integer
);

CREATE FUNCTION search_menu_wines(
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
  price_bottle INTEGER,
  price_glass INTEGER,
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
    ROUND(mer.price_bottle)::integer AS price_bottle,
    ROUND(mer.price_glass)::integer AS price_glass,
    mer.currency,
    mer.confidence,
    md.source_slug,
    ss.name AS venue_name,
    md.updated_at AS extracted_at,
    CASE
      WHEN length(trim(coalesce(p_query, ''))) = 0 THEN 0::numeric
      ELSE GREATEST(
        similarity(COALESCE(mer.producer, ''), p_query),
        similarity(COALESCE(mer.wine_name, ''), p_query)
      )
    END AS match_score
  FROM menu_extracted_rows mer
  JOIN menu_documents md ON mer.document_id = md.id
  JOIN starwinelist_sources ss ON md.source_slug = ss.slug
  WHERE ss.city = p_city
    AND md.extraction_status = 'completed'
    AND mer.needs_review = false
    AND mer.row_type = 'wine_row'
    AND (
      length(trim(coalesce(p_query, ''))) = 0
      OR (
        mer.producer ILIKE '%' || p_query || '%'
        OR mer.wine_name ILIKE '%' || p_query || '%'
        OR mer.region ILIKE '%' || p_query || '%'
        OR similarity(COALESCE(mer.producer, ''), p_query) > 0.25
        OR similarity(COALESCE(mer.wine_name, ''), p_query) > 0.25
      )
    )
    AND (p_min_price IS NULL OR mer.price_bottle >= p_min_price)
    AND (p_max_price IS NULL OR mer.price_bottle <= p_max_price)
    AND (p_wine_type IS NULL OR mer.wine_type = p_wine_type)
    AND (p_by_glass = FALSE OR mer.price_glass IS NOT NULL)
  ORDER BY
    (CASE WHEN length(trim(coalesce(p_query, ''))) = 0 THEN md.updated_at END) DESC NULLS LAST,
    (CASE WHEN length(trim(coalesce(p_query, ''))) = 0 THEN lower(mer.producer) END) ASC NULLS LAST,
    (CASE WHEN length(trim(coalesce(p_query, ''))) = 0 THEN lower(mer.wine_name) END) ASC NULLS LAST,
    (CASE
      WHEN length(trim(coalesce(p_query, ''))) > 0 THEN GREATEST(
        similarity(COALESCE(mer.producer, ''), p_query),
        similarity(COALESCE(mer.wine_name, ''), p_query)
      )
    END) DESC NULLS LAST,
    (CASE WHEN length(trim(coalesce(p_query, ''))) > 0 THEN mer.price_bottle END) ASC NULLS LAST,
    mer.id ASC;
$$;

REVOKE EXECUTE ON FUNCTION count_search_menu_wines(TEXT, TEXT, INTEGER, INTEGER, TEXT, BOOLEAN) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION search_menu_wines(TEXT, TEXT, INTEGER, INTEGER, TEXT, BOOLEAN, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION count_search_menu_wines(TEXT, TEXT, INTEGER, INTEGER, TEXT, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION search_menu_wines(TEXT, TEXT, INTEGER, INTEGER, TEXT, BOOLEAN, INTEGER, INTEGER) TO service_role;

COMMENT ON FUNCTION search_menu_wines IS 'Wine list search + browse: empty p_query lists all matching filters, newest menu first.';
COMMENT ON FUNCTION count_search_menu_wines IS 'Row count for search_menu_wines (browse when p_query empty).';
