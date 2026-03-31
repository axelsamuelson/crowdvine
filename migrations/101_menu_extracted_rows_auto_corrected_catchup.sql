-- Catch-up: if you applied migration 100 but not 099, auto_corrected is missing.
-- Safe to run even if 099 was already applied (IF NOT EXISTS).

ALTER TABLE menu_extracted_rows
  ADD COLUMN IF NOT EXISTS auto_corrected BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN menu_extracted_rows.auto_corrected IS 'True when this row was improved by auto-correction (few-shot re-extraction).';
