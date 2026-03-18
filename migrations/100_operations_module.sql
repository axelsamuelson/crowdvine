-- Migration 100: Operations module – objectives, key results, projects, tasks
-- Admin-only domain for strategy/operations tracking
-- Tables: admin_objectives, admin_key_results, admin_projects, admin_tasks,
--   admin_task_dependencies, admin_task_comments, admin_task_activity,
--   admin_entity_links, admin_task_templates

-- STEG 1: Objectives ---

CREATE TABLE admin_objectives (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT,
  period          TEXT NOT NULL,
  owner_id        UUID REFERENCES profiles(id),
  status          TEXT NOT NULL DEFAULT 'active',
  strategy_area   TEXT,
  progress_method TEXT NOT NULL DEFAULT 'key_results',
  manual_progress INTEGER,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- status: draft | active | completed | archived
-- strategy_area: Growth | Quality | Operations | Product
-- progress_method: manual | key_results | tasks

-- STEG 2: Key Results ---

CREATE TABLE admin_key_results (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id  UUID NOT NULL REFERENCES admin_objectives(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  type          TEXT NOT NULL DEFAULT 'numeric',
  start_value   NUMERIC DEFAULT 0,
  target_value  NUMERIC DEFAULT 100,
  current_value NUMERIC DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'active',
  due_date      DATE,
  owner_id      UUID REFERENCES profiles(id),
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- type: numeric | milestone | binary
-- status: active | completed | cancelled

-- STEG 3: Projects ---

CREATE TABLE admin_projects (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  description    TEXT,
  objective_id   UUID REFERENCES admin_objectives(id) ON DELETE SET NULL,
  key_result_id  UUID REFERENCES admin_key_results(id) ON DELETE SET NULL,
  owner_id       UUID REFERENCES profiles(id),
  status         TEXT NOT NULL DEFAULT 'active',
  priority       TEXT NOT NULL DEFAULT 'medium',
  start_date     DATE,
  due_date       DATE,
  deleted_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- status: planned | active | on_hold | completed | archived
-- priority: low | medium | high | critical

-- STEG 4: Tasks ---

CREATE TABLE admin_tasks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  description       TEXT,
  project_id        UUID REFERENCES admin_projects(id) ON DELETE SET NULL,
  objective_id      UUID REFERENCES admin_objectives(id) ON DELETE SET NULL,
  parent_task_id    UUID REFERENCES admin_tasks(id) ON DELETE CASCADE,
  assigned_to       UUID REFERENCES profiles(id),
  created_by        UUID NOT NULL REFERENCES profiles(id),
  status            TEXT NOT NULL DEFAULT 'todo',
  priority          TEXT NOT NULL DEFAULT 'medium',
  task_type         TEXT DEFAULT 'ops',
  due_date          DATE,
  start_date        DATE,
  completed_at      TIMESTAMPTZ,
  sort_order        INTEGER DEFAULT 0,
  status_sort_order INTEGER DEFAULT 0,
  estimated_hours   NUMERIC,
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- status: todo | in_progress | blocked | review | done | cancelled
-- priority: low | medium | high | urgent
-- task_type: feature | bug | data | content | ops | admin

-- STEG 5: Task dependencies ---

CREATE TABLE admin_task_dependencies (
  task_id       UUID NOT NULL REFERENCES admin_tasks(id) ON DELETE CASCADE,
  depends_on_id UUID NOT NULL REFERENCES admin_tasks(id) ON DELETE CASCADE,
  type          TEXT NOT NULL DEFAULT 'blocks',
  PRIMARY KEY (task_id, depends_on_id)
);

-- type: blocks | relates_to | duplicates

-- STEG 6: Comments ---

CREATE TABLE admin_task_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID NOT NULL REFERENCES admin_tasks(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES profiles(id),
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- STEG 7: Activity log ---

CREATE TABLE admin_task_activity (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES admin_tasks(id) ON DELETE CASCADE,
  actor_id    UUID NOT NULL REFERENCES profiles(id),
  action_type TEXT NOT NULL,
  old_value   TEXT,
  new_value   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- action_type: status_changed | assignee_changed | due_date_changed |
--   priority_changed | linked_to_project | linked_to_objective |
--   comment_added | created

-- STEG 8: Entity links ---

CREATE TABLE admin_entity_links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES admin_tasks(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  label       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- entity_type: producer | wine | wine_box | booking | reservation |
--   pallet | zone | menu_document | extraction_job | user | business

-- STEG 9: Task templates ---

CREATE TABLE admin_task_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT,
  entity_type   TEXT,
  template_data JSONB NOT NULL,
  created_by    UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- template_data format:
-- [{ "title": "", "description": "", "priority": "", "task_type": "" }]

-- STEG 10: Indexes ---

CREATE INDEX idx_admin_tasks_assigned_to ON admin_tasks(assigned_to);
CREATE INDEX idx_admin_tasks_status ON admin_tasks(status);
CREATE INDEX idx_admin_tasks_project_id ON admin_tasks(project_id);
CREATE INDEX idx_admin_tasks_objective_id ON admin_tasks(objective_id);
CREATE INDEX idx_admin_tasks_due_date ON admin_tasks(due_date);
CREATE INDEX idx_admin_tasks_parent_task_id ON admin_tasks(parent_task_id);
CREATE INDEX idx_admin_tasks_deleted_at ON admin_tasks(deleted_at);

CREATE INDEX idx_admin_entity_links_entity ON admin_entity_links(entity_type, entity_id);
CREATE INDEX idx_admin_entity_links_task_id ON admin_entity_links(task_id);

CREATE INDEX idx_admin_key_results_objective_id ON admin_key_results(objective_id);
CREATE INDEX idx_admin_projects_objective_id ON admin_projects(objective_id);
CREATE INDEX idx_admin_projects_owner_id ON admin_projects(owner_id);
CREATE INDEX idx_admin_task_activity_task_id ON admin_task_activity(task_id);
CREATE INDEX idx_admin_task_comments_task_id ON admin_task_comments(task_id);

-- STEG 11: updated_at trigger ---

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER admin_objectives_updated_at
  BEFORE UPDATE ON admin_objectives
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER admin_key_results_updated_at
  BEFORE UPDATE ON admin_key_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER admin_projects_updated_at
  BEFORE UPDATE ON admin_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER admin_tasks_updated_at
  BEFORE UPDATE ON admin_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER admin_task_comments_updated_at
  BEFORE UPDATE ON admin_task_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
