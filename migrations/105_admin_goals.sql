-- Goals: strategisk nivå ovanför Objectives (OKR Framework v3)

CREATE TABLE admin_goals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'active',
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- status: active | completed | paused | cancelled

CREATE INDEX idx_admin_goals_status ON admin_goals(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_admin_goals_deleted_at ON admin_goals(deleted_at);

ALTER TABLE admin_objectives
  ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES admin_goals(id) ON DELETE SET NULL;

CREATE INDEX idx_admin_objectives_goal_id ON admin_objectives(goal_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE admin_goals IS 'Strategic goals grouping objectives (operations / OKR).';
COMMENT ON COLUMN admin_objectives.goal_id IS 'Optional parent goal; SET NULL if goal removed.';

CREATE TRIGGER admin_goals_updated_at
  BEFORE UPDATE ON admin_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
