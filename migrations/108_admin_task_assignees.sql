-- Many-to-many assignees for admin tasks (keeps admin_tasks.assigned_to as primary / legacy filter)

CREATE TABLE admin_task_assignees (
  task_id    UUID NOT NULL REFERENCES admin_tasks(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (task_id, profile_id)
);

CREATE INDEX idx_admin_task_assignees_profile ON admin_task_assignees(profile_id);

COMMENT ON TABLE admin_task_assignees IS 'Additional assignees; admin_tasks.assigned_to should match first row for filters.';

INSERT INTO admin_task_assignees (task_id, profile_id)
SELECT id, assigned_to
FROM admin_tasks
WHERE assigned_to IS NOT NULL
  AND deleted_at IS NULL
ON CONFLICT DO NOTHING;
