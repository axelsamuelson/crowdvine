-- Senaste extraktionsförsök (lyckat eller misslyckat) för sortering och visning i admin

ALTER TABLE menu_documents
  ADD COLUMN IF NOT EXISTS last_extraction_attempt_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN menu_documents.last_extraction_attempt_at IS 'Timestamp of the last extraction run start or finish (success or failed).';

-- Befintliga lyckade extraktioner: fyll från extracted_at så listor blir begripliga
UPDATE menu_documents
SET last_extraction_attempt_at = extracted_at
WHERE extracted_at IS NOT NULL
  AND last_extraction_attempt_at IS NULL;
