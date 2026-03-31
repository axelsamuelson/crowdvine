-- Vem som skapade objectives och projects (tasks har redan created_by)

ALTER TABLE admin_objectives
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE admin_projects
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN admin_objectives.created_by IS 'Admin user who created the objective.';
COMMENT ON COLUMN admin_projects.created_by IS 'Admin user who created the project.';
