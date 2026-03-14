-- Migration 093: Menu extraction – document upload, AI extraction, sections & rows
-- Isolated ingestion domain: menu_documents, menu_document_sections, menu_extracted_rows, menu_extraction_feedback
-- RLS: Admin-only access for all tables

-- 1) menu_documents – one row per uploaded menu/PDF
CREATE TABLE menu_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT DEFAULT 'application/pdf',
  source_type TEXT DEFAULT 'pdf',
  upload_status TEXT NOT NULL DEFAULT 'uploaded',
  extraction_status TEXT NOT NULL DEFAULT 'pending',
  page_count INTEGER NULL,
  raw_text TEXT NULL,
  ai_raw_response JSONB NULL,
  model_version TEXT NULL,
  prompt_version TEXT NULL,
  workflow_version TEXT NULL,
  extracted_at TIMESTAMPTZ NULL,
  error_message TEXT NULL
);

COMMENT ON TABLE menu_documents IS 'Uploaded menu/PDF; stores file reference, extraction status and raw AI output. Re-processable.';
COMMENT ON COLUMN menu_documents.upload_status IS 'uploaded | processing | failed';
COMMENT ON COLUMN menu_documents.extraction_status IS 'pending | processing | completed | failed';
COMMENT ON COLUMN menu_documents.raw_text IS 'Extracted text from PDF (or source).';
COMMENT ON COLUMN menu_documents.ai_raw_response IS 'Exact AI output, unmodified – source of truth for audit.';
COMMENT ON COLUMN menu_documents.model_version IS 'Model identifier, e.g. claude-sonnet-4-20250514';
COMMENT ON COLUMN menu_documents.prompt_version IS 'Prompt version, e.g. menu-extraction-v1';
COMMENT ON COLUMN menu_documents.workflow_version IS 'Workflow version, e.g. 1.0.0';

CREATE INDEX idx_menu_documents_extraction_status ON menu_documents(extraction_status);
CREATE INDEX idx_menu_documents_created_at ON menu_documents(created_at DESC);

-- 2) menu_document_sections – sections identified by AI (e.g. Bubbel, Vitt, Rött)
CREATE TABLE menu_document_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  document_id UUID NOT NULL REFERENCES menu_documents(id) ON DELETE CASCADE,
  section_name TEXT NOT NULL,
  normalized_section TEXT NULL,
  page_number INTEGER NULL,
  section_order INTEGER NOT NULL DEFAULT 0
);

COMMENT ON TABLE menu_document_sections IS 'Sections identified by AI (e.g. Bubbel, Vitt, Rött). Belongs to menu_documents.';
COMMENT ON COLUMN menu_document_sections.section_name IS 'Raw name from AI, e.g. Vitt';
COMMENT ON COLUMN menu_document_sections.normalized_section IS 'Normalized key, e.g. white';

CREATE INDEX idx_menu_document_sections_document_id ON menu_document_sections(document_id);
CREATE INDEX idx_menu_document_sections_document_order ON menu_document_sections(document_id, section_order);

-- 3) menu_extracted_rows – each extracted wine row (or header/description/noise)
CREATE TABLE menu_extracted_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  document_id UUID NOT NULL REFERENCES menu_documents(id) ON DELETE CASCADE,
  section_id UUID NULL REFERENCES menu_document_sections(id) ON DELETE SET NULL,
  row_index INTEGER NOT NULL DEFAULT 0,
  page_number INTEGER NULL,
  raw_text TEXT NOT NULL,
  row_type TEXT NOT NULL DEFAULT 'wine_row',
  wine_type TEXT NULL,
  producer TEXT NULL,
  wine_name TEXT NULL,
  vintage TEXT NULL,
  region TEXT NULL,
  country TEXT NULL,
  grapes TEXT[] NULL,
  attributes TEXT[] NULL,
  format_label TEXT NULL,
  price_glass NUMERIC(12, 2) NULL,
  price_bottle NUMERIC(12, 2) NULL,
  price_other NUMERIC(12, 2) NULL,
  currency TEXT NOT NULL DEFAULT 'SEK',
  confidence NUMERIC(3, 2) NULL,
  confidence_label TEXT NULL,
  needs_review BOOLEAN NOT NULL DEFAULT true,
  review_reasons TEXT[] NULL,
  normalized_payload JSONB NULL,
  validation_flags JSONB NULL,
  extraction_version TEXT NULL
);

COMMENT ON TABLE menu_extracted_rows IS 'Each extracted line from a menu: wine row, header, description or noise. Re-processable per document.';
COMMENT ON COLUMN menu_extracted_rows.row_type IS 'wine_row | header | description | noise | unknown';
COMMENT ON COLUMN menu_extracted_rows.wine_type IS 'sparkling | white | orange | rose | red | sweet | fortified | non_alcoholic | unknown';
COMMENT ON COLUMN menu_extracted_rows.vintage IS 'Stored as text: 2022, N.V., NV';
COMMENT ON COLUMN menu_extracted_rows.country IS 'Normalized English, e.g. France, Italy';
COMMENT ON COLUMN menu_extracted_rows.grapes IS 'Only if explicit in menu text – never inferred.';
COMMENT ON COLUMN menu_extracted_rows.attributes IS 'Exact as in menu, e.g. NATURVIN, EKO';
COMMENT ON COLUMN menu_extracted_rows.confidence_label IS 'high (≥0.85) | medium (0.6–0.84) | low (<0.6)';
COMMENT ON COLUMN menu_extracted_rows.review_reasons IS 'Codes e.g. missing_price, grapes_inferred, low_confidence';

CREATE INDEX idx_menu_extracted_rows_document_id ON menu_extracted_rows(document_id);
CREATE INDEX idx_menu_extracted_rows_section_id ON menu_extracted_rows(section_id) WHERE section_id IS NOT NULL;
CREATE INDEX idx_menu_extracted_rows_row_type ON menu_extracted_rows(document_id, row_type);
CREATE INDEX idx_menu_extracted_rows_needs_review ON menu_extracted_rows(document_id, needs_review) WHERE needs_review = true;

-- 4) menu_extraction_feedback – learning loop (table now, UI later)
CREATE TABLE menu_extraction_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  row_id UUID NOT NULL REFERENCES menu_extracted_rows(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES menu_documents(id) ON DELETE CASCADE,
  original_prediction JSONB NOT NULL,
  corrected_payload JSONB NOT NULL,
  error_types TEXT[] NULL,
  corrected_by UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT NULL
);

COMMENT ON TABLE menu_extraction_feedback IS 'Human corrections for extracted rows; used for learning loop.';
COMMENT ON COLUMN menu_extraction_feedback.original_prediction IS 'Snapshot of AI prediction that was corrected.';
COMMENT ON COLUMN menu_extraction_feedback.corrected_payload IS 'Human-approved payload.';

CREATE INDEX idx_menu_extraction_feedback_row_id ON menu_extraction_feedback(row_id);
CREATE INDEX idx_menu_extraction_feedback_document_id ON menu_extraction_feedback(document_id);

-- RLS: admin-only for all four tables
ALTER TABLE menu_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_document_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_extracted_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_extraction_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage menu_documents" ON menu_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR (profiles.roles IS NOT NULL AND 'admin' = ANY(profiles.roles)))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR (profiles.roles IS NOT NULL AND 'admin' = ANY(profiles.roles)))
    )
  );

CREATE POLICY "Admins can manage menu_document_sections" ON menu_document_sections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR (profiles.roles IS NOT NULL AND 'admin' = ANY(profiles.roles)))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR (profiles.roles IS NOT NULL AND 'admin' = ANY(profiles.roles)))
    )
  );

CREATE POLICY "Admins can manage menu_extracted_rows" ON menu_extracted_rows
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR (profiles.roles IS NOT NULL AND 'admin' = ANY(profiles.roles)))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR (profiles.roles IS NOT NULL AND 'admin' = ANY(profiles.roles)))
    )
  );

CREATE POLICY "Admins can manage menu_extraction_feedback" ON menu_extraction_feedback
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR (profiles.roles IS NOT NULL AND 'admin' = ANY(profiles.roles)))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR (profiles.roles IS NOT NULL AND 'admin' = ANY(profiles.roles)))
    )
  );
