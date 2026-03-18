-- Migration 098: Menu extraction batches – track Anthropic Batch API jobs for bulk extraction
-- Phase 1 (PDF + sections) runs sync; phase 2 (section extractions) runs via Batch API (50% discount).

CREATE TABLE IF NOT EXISTS menu_extraction_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  anthropic_batch_id TEXT NULL,
  document_ids UUID[] NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted',
  phase_1_result JSONB NULL,
  error_message TEXT NULL,
  processed_at TIMESTAMPTZ NULL
);

COMMENT ON TABLE menu_extraction_batches IS 'Bulk menu extraction via Anthropic Message Batches API. phase_1_result stores rawText and sectionNames per document for reassembly.';
COMMENT ON COLUMN menu_extraction_batches.status IS 'submitted | processing | ended | processed | failed';
COMMENT ON COLUMN menu_extraction_batches.phase_1_result IS 'Map documentId -> { rawText, sectionNames } from phase 1.';

CREATE INDEX IF NOT EXISTS idx_menu_extraction_batches_anthropic_id ON menu_extraction_batches(anthropic_batch_id) WHERE anthropic_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_menu_extraction_batches_status ON menu_extraction_batches(status);
CREATE INDEX IF NOT EXISTS idx_menu_extraction_batches_created_at ON menu_extraction_batches(created_at DESC);
