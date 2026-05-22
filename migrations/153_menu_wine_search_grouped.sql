-- Grouped wine search: one row per (producer, wine_name, vintage) with place_count and venues JSON.
-- Server-side sort + pagination apply to all groups before LIMIT/OFFSET.

CREATE OR REPLACE FUNCTION count_search_menu_wines_grouped(
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
  FROM (
    SELECT 1
    FROM menu_extracted_rows mer
    JOIN menu_documents md ON mer.document_id = md.id
    LEFT JOIN starwinelist_sources ss ON md.source_slug = ss.slug
    WHERE md.extraction_status = 'completed'
      AND mer.needs_review = false
      AND mer.row_type = 'wine_row'
      AND (
        md.source_slug IS NULL
        OR ss.city IS NULL
        OR ss.city = p_city
      )
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
      AND (p_min_price IS NULL OR mer.price_bottle IS NULL OR mer.price_bottle >= p_min_price)
      AND (p_max_price IS NULL OR mer.price_bottle IS NULL OR mer.price_bottle <= p_max_price)
      AND (p_wine_type IS NULL OR mer.wine_type = p_wine_type)
      AND (p_by_glass = FALSE OR mer.price_glass IS NOT NULL)
    GROUP BY
      lower(trim(coalesce(mer.producer, ''))),
      lower(trim(coalesce(mer.wine_name, ''))),
      lower(trim(coalesce(mer.vintage, '')))
  ) g;
$$;

CREATE OR REPLACE FUNCTION search_menu_wines_grouped(
  p_query TEXT,
  p_city TEXT DEFAULT 'stockholm',
  p_min_price INTEGER DEFAULT NULL,
  p_max_price INTEGER DEFAULT NULL,
  p_wine_type TEXT DEFAULT NULL,
  p_by_glass BOOLEAN DEFAULT FALSE,
  p_sort TEXT DEFAULT 'newest',
  p_sort_dir TEXT DEFAULT 'desc',
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  producer TEXT,
  wine_name TEXT,
  vintage TEXT,
  region TEXT,
  country TEXT,
  wine_type TEXT,
  currency TEXT,
  price_glass_min INTEGER,
  price_glass_max INTEGER,
  price_bottle_min INTEGER,
  price_bottle_max INTEGER,
  place_count BIGINT,
  match_score NUMERIC,
  newest_menu_at TIMESTAMPTZ,
  venues JSONB
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  order_clause TEXT;
  sql TEXT;
BEGIN
  IF p_sort NOT IN ('producer', 'price_bottle', 'price_glass', 'places', 'relevance', 'newest')
     OR p_sort_dir NOT IN ('asc', 'desc') THEN
    RAISE EXCEPTION 'invalid sort parameters';
  END IF;

  order_clause := CASE
    WHEN p_sort = 'producer' AND p_sort_dir = 'asc' THEN
      'lower(trim(coalesce(producer, ''''))) ASC NULLS LAST, lower(trim(coalesce(wine_name, ''''))) ASC NULLS LAST'
    WHEN p_sort = 'producer' AND p_sort_dir = 'desc' THEN
      'lower(trim(coalesce(producer, ''''))) DESC NULLS LAST, lower(trim(coalesce(wine_name, ''''))) DESC NULLS LAST'
    WHEN p_sort = 'price_bottle' AND p_sort_dir = 'asc' THEN
      'price_bottle_min ASC NULLS LAST, lower(trim(coalesce(producer, ''''))) ASC'
    WHEN p_sort = 'price_bottle' AND p_sort_dir = 'desc' THEN
      'price_bottle_min DESC NULLS LAST, lower(trim(coalesce(producer, ''''))) ASC'
    WHEN p_sort = 'price_glass' AND p_sort_dir = 'asc' THEN
      'price_glass_min ASC NULLS LAST, lower(trim(coalesce(producer, ''''))) ASC'
    WHEN p_sort = 'price_glass' AND p_sort_dir = 'desc' THEN
      'price_glass_min DESC NULLS LAST, lower(trim(coalesce(producer, ''''))) ASC'
    WHEN p_sort = 'places' AND p_sort_dir = 'asc' THEN
      'place_count ASC, lower(trim(coalesce(producer, ''''))) ASC'
    WHEN p_sort = 'places' AND p_sort_dir = 'desc' THEN
      'place_count DESC, lower(trim(coalesce(producer, ''''))) ASC'
    WHEN p_sort = 'relevance' AND p_sort_dir = 'asc' THEN
      'match_score ASC NULLS LAST, newest_menu_at DESC NULLS LAST, lower(trim(coalesce(producer, ''''))) ASC'
    WHEN p_sort = 'relevance' AND p_sort_dir = 'desc' THEN
      'match_score DESC NULLS LAST, newest_menu_at DESC NULLS LAST, lower(trim(coalesce(producer, ''''))) ASC'
    WHEN p_sort = 'newest' AND p_sort_dir = 'asc' THEN
      'newest_menu_at ASC NULLS LAST, lower(trim(coalesce(producer, ''''))) ASC'
    ELSE
      'newest_menu_at DESC NULLS LAST, lower(trim(coalesce(producer, ''''))) ASC'
  END;

  sql := $q$
    WITH base AS (
      SELECT
        lower(trim(coalesce(mer.producer, ''))) AS g_p,
        lower(trim(coalesce(mer.wine_name, ''))) AS g_w,
        lower(trim(coalesce(mer.vintage, ''))) AS g_v,
        mer.producer AS producer,
        mer.wine_name AS wine_name,
        mer.vintage AS vintage,
        mer.wine_type AS wine_type,
        mer.region AS region,
        mer.country AS country,
        mer.currency AS currency,
        mer.price_glass AS price_glass,
        mer.price_bottle AS price_bottle,
        md.id AS doc_id,
        md.updated_at AS doc_updated,
        md.source_slug AS doc_slug,
        COALESCE(NULLIF(trim(ss.name), ''), NULLIF(trim(md.file_name), ''), 'Meny') AS v_name,
        CASE
          WHEN length(trim(coalesce($5::text, ''))) = 0 THEN 0::numeric
          ELSE GREATEST(
            similarity(COALESCE(mer.producer, ''), $5::text),
            similarity(COALESCE(mer.wine_name, ''), $5::text)
          )
        END AS row_match
      FROM menu_extracted_rows mer
      JOIN menu_documents md ON mer.document_id = md.id
      LEFT JOIN starwinelist_sources ss ON md.source_slug = ss.slug
      WHERE md.extraction_status = 'completed'
        AND mer.needs_review = false
        AND mer.row_type = 'wine_row'
        AND (
          md.source_slug IS NULL
          OR ss.city IS NULL
          OR ss.city = $6::text
        )
        AND (
          length(trim(coalesce($5::text, ''))) = 0
          OR (
            mer.producer ILIKE '%' || $5 || '%'
            OR mer.wine_name ILIKE '%' || $5 || '%'
            OR mer.region ILIKE '%' || $5 || '%'
            OR similarity(COALESCE(mer.producer, ''), $5::text) > 0.25
            OR similarity(COALESCE(mer.wine_name, ''), $5::text) > 0.25
          )
        )
        AND ($1::integer IS NULL OR mer.price_bottle IS NULL OR mer.price_bottle >= $1)
        AND ($2::integer IS NULL OR mer.price_bottle IS NULL OR mer.price_bottle <= $2)
        AND ($3::text IS NULL OR mer.wine_type = $3)
        AND ($4::boolean = false OR mer.price_glass IS NOT NULL)
    ),
    agg AS (
      SELECT
        max(b.producer) AS producer,
        max(b.wine_name) AS wine_name,
        max(b.vintage) AS vintage,
        max(b.wine_type) AS wine_type,
        max(b.region) AS region,
        max(b.country) AS country,
        max(b.currency) AS currency,
        min(ROUND(b.price_glass)::integer) FILTER (WHERE b.price_glass IS NOT NULL) AS price_glass_min,
        max(ROUND(b.price_glass)::integer) FILTER (WHERE b.price_glass IS NOT NULL) AS price_glass_max,
        min(ROUND(b.price_bottle)::integer) FILTER (WHERE b.price_bottle IS NOT NULL) AS price_bottle_min,
        max(ROUND(b.price_bottle)::integer) FILTER (WHERE b.price_bottle IS NOT NULL) AS price_bottle_max,
        count(DISTINCT b.doc_id) AS place_count,
        max(b.row_match) AS match_score,
        max(b.doc_updated) AS newest_menu_at,
        coalesce(
          jsonb_agg(
            DISTINCT jsonb_build_object(
              'document_id', b.doc_id::text,
              'venue_name', b.v_name,
              'starwinelist_slug', b.doc_slug,
              'extracted_at', b.doc_updated
            )
          ),
          '[]'::jsonb
        ) AS venues
      FROM base b
      GROUP BY b.g_p, b.g_w, b.g_v
    )
    SELECT
      a.producer,
      a.wine_name,
      a.vintage,
      a.region,
      a.country,
      a.wine_type,
      a.currency,
      a.price_glass_min,
      a.price_glass_max,
      a.price_bottle_min,
      a.price_bottle_max,
      a.place_count,
      a.match_score,
      a.newest_menu_at,
      a.venues
    FROM agg a
    ORDER BY
  $q$ || order_clause || $q$
    LIMIT $7
    OFFSET $8
  $q$;

  RETURN QUERY EXECUTE sql
    USING p_min_price, p_max_price, p_wine_type, p_by_glass, p_query, p_city, p_limit, p_offset;
END;
$$;

REVOKE EXECUTE ON FUNCTION count_search_menu_wines_grouped(TEXT, TEXT, INTEGER, INTEGER, TEXT, BOOLEAN) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION search_menu_wines_grouped(TEXT, TEXT, INTEGER, INTEGER, TEXT, BOOLEAN, TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION count_search_menu_wines_grouped(TEXT, TEXT, INTEGER, INTEGER, TEXT, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION search_menu_wines_grouped(TEXT, TEXT, INTEGER, INTEGER, TEXT, BOOLEAN, TEXT, TEXT, INTEGER, INTEGER) TO service_role;

COMMENT ON FUNCTION search_menu_wines_grouped IS 'Grouped wine search: distinct venues per wine identity, JSON venues list, server-side sort.';
COMMENT ON FUNCTION count_search_menu_wines_grouped IS 'Count of grouped wine identities (same filters as search_menu_wines_grouped).';
