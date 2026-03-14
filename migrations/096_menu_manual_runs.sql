-- Migration 096: Manual run tracking for menu pipeline (step-by-step diagnostics, no queue).
-- Used by POST/GET /api/admin/menu/manual-run.

CREATE TABLE menu_manual_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  slug TEXT NOT NULL,
  city TEXT NULL DEFAULT 'stockholm',

  status TEXT NOT NULL DEFAULT 'pending',
  document_id UUID NULL REFERENCES menu_documents(id) ON DELETE SET NULL,
  content_hash TEXT NULL,

  steps JSONB NOT NULL DEFAULT '[]',
  error_message TEXT NULL,

  started_at TIMESTAMPTZ NULL,
  finished_at TIMESTAMPTZ NULL
);

COMMENT ON TABLE menu_manual_runs IS 'One row per manual menu pipeline run; steps hold step-by-step log for diagnostics.';
COMMENT ON COLUMN menu_manual_runs.status IS 'pending | running | completed | failed | unchanged';
COMMENT ON COLUMN menu_manual_runs.steps IS 'Array of { name, started_at, finished_at, ok, summary?, error? } for each pipeline step.';

CREATE INDEX idx_menu_manual_runs_slug ON menu_manual_runs(slug);
CREATE INDEX idx_menu_manual_runs_status ON menu_manual_runs(status);
CREATE INDEX idx_menu_manual_runs_created_at ON menu_manual_runs(created_at DESC);

ALTER TABLE menu_manual_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage menu_manual_runs" ON menu_manual_runs
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
