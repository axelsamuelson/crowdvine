-- Objective progress via manually added "insights" (unique text per objective up to insights_target).

ALTER TABLE admin_objectives
  ADD COLUMN IF NOT EXISTS insights_target INTEGER;

COMMENT ON COLUMN admin_objectives.insights_target IS
  'When progress_method = insights: number of unique insights required for 100% progress.';

CREATE TABLE IF NOT EXISTS admin_objective_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID NOT NULL REFERENCES admin_objectives(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_admin_objective_insights_objective_id
  ON admin_objective_insights(objective_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_objective_insights_unique_body
  ON admin_objective_insights (objective_id, lower(trim(body)));

COMMENT ON TABLE admin_objective_insights IS
  'User-added insights for objectives using progress_method = insights; body unique per objective (trim+lower).';
