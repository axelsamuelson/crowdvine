-- Parent task status sync: do not auto-set parent to done / in_progress when parent is paused.

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
      AND status NOT IN ('cancelled', 'blocked', 'paused');
  ELSE
    UPDATE admin_tasks
    SET
      status = CASE
        WHEN status = 'paused' THEN 'paused'
        WHEN status = 'done' THEN 'in_progress'
        ELSE status
      END,
      completed_at = CASE
        WHEN status = 'paused' THEN completed_at
        WHEN status = 'done' THEN NULL
        ELSE completed_at
      END,
      updated_at = NOW()
    WHERE id = p_parent_id
      AND deleted_at IS NULL;
  END IF;
END;
$$;

COMMENT ON FUNCTION admin_sync_parent_task_status_from_subtasks(UUID) IS
  'Recalculate parent admin_tasks.status from non-deleted children. Does not override paused/cancelled/blocked when setting done.';
