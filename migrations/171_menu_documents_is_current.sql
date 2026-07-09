-- Migration 171: Flag current menu document per venue (search uses latest only; history retained).

ALTER TABLE menu_documents
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN menu_documents.is_current IS
  'Searchable snapshot flag. Per source_slug: exactly one current completed doc (older same-slug = false). source_slug NULL: all completed docs stay current (distinct manual uploads; venue unknown).';

-- Backfill: one current doc per source_slug (latest_document_id preferred, else newest extracted).
UPDATE menu_documents
SET is_current = false
WHERE extraction_status = 'completed'
  AND source_slug IS NOT NULL;

WITH canonical AS (
  SELECT DISTINCT ON (md.source_slug)
    md.id
  FROM menu_documents md
  LEFT JOIN starwinelist_sources ss ON ss.slug = md.source_slug
  WHERE md.extraction_status = 'completed'
    AND md.source_slug IS NOT NULL
  ORDER BY
    md.source_slug,
    CASE
      WHEN ss.latest_document_id IS NOT NULL AND md.id = ss.latest_document_id THEN 0
      ELSE 1
    END,
    md.extracted_at DESC NULLS LAST,
    md.created_at DESC
)
UPDATE menu_documents md
SET is_current = true
FROM canonical c
WHERE md.id = c.id;

-- source_slug NULL: keep ALL completed docs current (distinct manual venue uploads; no slug to dedupe by).
UPDATE menu_documents
SET is_current = true
WHERE source_slug IS NULL
  AND extraction_status = 'completed';

CREATE INDEX IF NOT EXISTS idx_menu_documents_source_slug_is_current
  ON menu_documents (source_slug, is_current)
  WHERE source_slug IS NOT NULL AND is_current = true;

-- Atomic flip when a document becomes the searchable snapshot for its slug.
CREATE OR REPLACE FUNCTION promote_menu_document_to_current(p_document_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_slug TEXT;
  v_status TEXT;
BEGIN
  SELECT source_slug, extraction_status
  INTO v_slug, v_status
  FROM menu_documents
  WHERE id = p_document_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'menu_document not found: %', p_document_id;
  END IF;

  IF v_status IS DISTINCT FROM 'completed' THEN
    RAISE EXCEPTION 'menu_document % is not completed (status=%)', p_document_id, v_status;
  END IF;

  IF v_slug IS NULL THEN
    -- Manual uploads without slug: do not supersede other null-slug venues.
    UPDATE menu_documents
    SET is_current = true
    WHERE id = p_document_id;

    RETURN;
  END IF;

  UPDATE menu_documents
  SET is_current = false
  WHERE source_slug = v_slug
    AND id <> p_document_id
    AND extraction_status = 'completed';

  UPDATE menu_documents
  SET is_current = true
  WHERE id = p_document_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION promote_menu_document_to_current(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION promote_menu_document_to_current(UUID) TO service_role;

COMMENT ON FUNCTION promote_menu_document_to_current IS
  'Demote prior completed docs for the same source_slug and mark p_document_id current. Null-slug docs only self-promote (no cross-doc demotion).';
