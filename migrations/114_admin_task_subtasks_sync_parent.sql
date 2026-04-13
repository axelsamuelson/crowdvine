-- When a task has checklist-style subtasks (child rows via parent_task_id), keep parent
-- status in sync: all active subtasks "done" → parent "done"; otherwise if parent was
-- "done", move back to "in_progress". Does not override "blocked" or "cancelled".

CREATE OR REPLACE FUNCTION admin_sync_parent_task_status_from_subtasks(p_parent_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n_total INT;
  n_done INT;
BEGIN
  IF p_parent_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM admin_tasks WHERE id = p_parent_id AND deleted_at IS NULL
  ) THEN
    RETURN;
  END IF;

  SELECT COUNT(*)::INT INTO n_total
  FROM admin_tasks
  WHERE parent_task_id = p_parent_id
    AND deleted_at IS NULL;

  IF n_total = 0 THEN
    RETURN;
  END IF;

  SELECT COUNT(*)::INT INTO n_done
  FROM admin_tasks
  WHERE parent_task_id = p_parent_id
    AND deleted_at IS NULL
    AND status = 'done';

  IF n_done = n_total THEN
    UPDATE admin_tasks
    SET
      status = 'done',
      completed_at = COALESCE(completed_at, NOW()),
      updated_at = NOW()
    WHERE id = p_parent_id
      AND deleted_at IS NULL
      AND status NOT IN ('cancelled', 'blocked');
  ELSE
    UPDATE admin_tasks
    SET
      status = CASE WHEN status = 'done' THEN 'in_progress' ELSE status END,
      completed_at = CASE WHEN status = 'done' THEN NULL ELSE completed_at END,
      updated_at = NOW()
    WHERE id = p_parent_id
      AND deleted_at IS NULL;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION admin_tasks_subtasks_sync_parent_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.parent_task_id IS NOT NULL THEN
      PERFORM admin_sync_parent_task_status_from_subtasks(OLD.parent_task_id);
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.parent_task_id IS NOT NULL
       AND OLD.parent_task_id IS DISTINCT FROM NEW.parent_task_id THEN
      PERFORM admin_sync_parent_task_status_from_subtasks(OLD.parent_task_id);
    END IF;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.parent_task_id IS NOT NULL THEN
    PERFORM admin_sync_parent_task_status_from_subtasks(NEW.parent_task_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS admin_tasks_subtasks_sync_parent ON admin_tasks;

CREATE TRIGGER admin_tasks_subtasks_sync_parent
  AFTER INSERT OR UPDATE OR DELETE ON admin_tasks
  FOR EACH ROW
  EXECUTE FUNCTION admin_tasks_subtasks_sync_parent_trigger();

COMMENT ON FUNCTION admin_sync_parent_task_status_from_subtasks(UUID) IS
  'Recalculate parent admin_tasks.status from non-deleted children (parent_task_id).';
