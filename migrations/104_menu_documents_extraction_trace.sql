-- Full Actor/Critic trace per extraction run (JSON: sections, steps, costs).

ALTER TABLE menu_documents
  ADD COLUMN IF NOT EXISTS extraction_trace JSONB;

COMMENT ON COLUMN menu_documents.extraction_trace IS 'Full trace of Actor/Critic iterations per section including costs';
