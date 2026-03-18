-- Migration 097: Store last extraction token usage on menu_documents for cost monitoring
-- Used with prompt caching and model selection (see lib/menu-extraction/service.ts)

ALTER TABLE menu_documents
  ADD COLUMN IF NOT EXISTS extraction_input_tokens INTEGER NULL,
  ADD COLUMN IF NOT EXISTS extraction_output_tokens INTEGER NULL,
  ADD COLUMN IF NOT EXISTS extraction_cache_read_input_tokens INTEGER NULL,
  ADD COLUMN IF NOT EXISTS extraction_cache_creation_input_tokens INTEGER NULL;

COMMENT ON COLUMN menu_documents.extraction_input_tokens IS 'Input tokens consumed by last extraction (post-cache).';
COMMENT ON COLUMN menu_documents.extraction_output_tokens IS 'Output tokens from last extraction.';
COMMENT ON COLUMN menu_documents.extraction_cache_read_input_tokens IS 'Tokens read from prompt cache on last extraction.';
COMMENT ON COLUMN menu_documents.extraction_cache_creation_input_tokens IS 'Tokens written to prompt cache on last extraction.';
