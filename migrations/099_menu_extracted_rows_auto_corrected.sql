-- Migration 099: Track rows improved by auto-correction (few-shot re-extraction)
-- Used by admin UI to show "Auto-korrigerad" badge and stats

ALTER TABLE menu_extracted_rows
  ADD COLUMN IF NOT EXISTS auto_corrected BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN menu_extracted_rows.auto_corrected IS 'True when this row was improved by auto-correction (second pass with few-shot from feedback).';
