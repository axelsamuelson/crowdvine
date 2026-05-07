-- Track automatic retry attempts for failed / stuck menu extractions (cron retry job).

ALTER TABLE menu_documents
  ADD COLUMN IF NOT EXISTS extraction_retry_count INTEGER NULL DEFAULT NULL;

COMMENT ON COLUMN menu_documents.extraction_retry_count IS 'Incremented when the retry-failed-extractions cron re-queues a document; null = never retried by cron.';

CREATE INDEX IF NOT EXISTS idx_menu_documents_extraction_retry_pending
  ON menu_documents (extraction_status, created_at ASC)
  WHERE extraction_status = 'pending';
