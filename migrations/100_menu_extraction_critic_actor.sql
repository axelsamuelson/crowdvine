-- Migration 100: Critic-Actor loop metadata on rows and documents

ALTER TABLE menu_extracted_rows
  ADD COLUMN IF NOT EXISTS extraction_iterations INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS critic_approved BOOLEAN NULL;

COMMENT ON COLUMN menu_extracted_rows.extraction_iterations IS 'Actor-Critic rounds for this row''s section (1–3).';
COMMENT ON COLUMN menu_extracted_rows.critic_approved IS 'NULL if Critic skipped/failed; true if approved; false if max iterations without approval.';

ALTER TABLE menu_documents
  ADD COLUMN IF NOT EXISTS critic_stats JSONB NULL,
  ADD COLUMN IF NOT EXISTS used_batch_api BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN menu_documents.critic_stats IS 'Aggregated Critic-Actor stats: approved_direct, improved_by_critic, escalated, etc.';
COMMENT ON COLUMN menu_documents.used_batch_api IS 'True when section Actor used Anthropic Batch API (50% discount).';
