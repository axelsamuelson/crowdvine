-- Migration 095: Add content_hash and source_slug to menu_documents for idempotency and venue linkage.
-- content_hash: SHA-256 hex of PDF buffer; used to skip re-processing unchanged PDFs.
-- source_slug: Starwinelist slug (e.g. agnes) for easier join to starwinelist_sources without FK.

ALTER TABLE menu_documents
  ADD COLUMN IF NOT EXISTS content_hash TEXT NULL,
  ADD COLUMN IF NOT EXISTS source_slug TEXT NULL;

COMMENT ON COLUMN menu_documents.content_hash IS 'SHA-256 hex of PDF content; used for idempotency (skip AI if unchanged).';
COMMENT ON COLUMN menu_documents.source_slug IS 'Starwinelist venue slug (e.g. agnes) for linkage to starwinelist_sources.';

CREATE INDEX IF NOT EXISTS idx_menu_documents_source_slug ON menu_documents(source_slug) WHERE source_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_menu_documents_content_hash ON menu_documents(content_hash) WHERE content_hash IS NOT NULL;
