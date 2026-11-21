-- Driftöversikt v7: Fokus tab — task points, completed_at trigger, objective target shares.
-- Additive / idempotent. Does NOT backfill target_share / effect_metric_key (set in TEST seed only).
--
-- target_group model: when target_group is set (e.g. '4-6'), target_share on those rows
-- is the group's shared share (same value on each member). Individual rows show "i grupp …";
-- the summary row "Mål 4–6 tillsammans" uses that share. Solo goals keep target_group NULL
-- and their own target_share.

-- ── admin_tasks.task_points ──────────────────────────────────────────────
ALTER TABLE public.admin_tasks
  ADD COLUMN IF NOT EXISTS task_points smallint;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'admin_tasks_task_points_check'
  ) THEN
    ALTER TABLE public.admin_tasks
      ADD CONSTRAINT admin_tasks_task_points_check
      CHECK (task_points IS NULL OR task_points IN (1, 2, 4, 8));
  END IF;
END $$;

COMMENT ON COLUMN public.admin_tasks.task_points IS
  'Effort points: 1|2|4|8. Null = missing (shown as – p).';

-- ── admin_tasks.points_status ────────────────────────────────────────────
ALTER TABLE public.admin_tasks
  ADD COLUMN IF NOT EXISTS points_status text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'admin_tasks_points_status_check'
  ) THEN
    ALTER TABLE public.admin_tasks
      ADD CONSTRAINT admin_tasks_points_status_check
      CHECK (
        points_status IS NULL
        OR points_status IN ('proposed', 'confirmed')
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'admin_tasks_points_status_consistency'
  ) THEN
    ALTER TABLE public.admin_tasks
      ADD CONSTRAINT admin_tasks_points_status_consistency
      CHECK (
        (task_points IS NULL AND points_status IS NULL)
        OR (task_points IS NOT NULL AND points_status IS NOT NULL)
      );
  END IF;
END $$;

COMMENT ON COLUMN public.admin_tasks.points_status IS
  'proposed = dashed badge (awaiting Pierre/Léa); confirmed = solid. Null when no points.';

-- ── completed_at: column already exists (migration 100); ensure trigger ──
CREATE OR REPLACE FUNCTION public.admin_tasks_set_completed_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'done' AND NEW.completed_at IS NULL THEN
      NEW.completed_at := COALESCE(NEW.updated_at, now());
    ELSIF NEW.status IS DISTINCT FROM 'done' THEN
      NEW.completed_at := NULL;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE
  IF NEW.status = 'done' AND OLD.status IS DISTINCT FROM 'done' THEN
    NEW.completed_at := COALESCE(NEW.completed_at, now());
  ELSIF NEW.status IS DISTINCT FROM 'done' AND OLD.status = 'done' THEN
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS admin_tasks_set_completed_at ON public.admin_tasks;
CREATE TRIGGER admin_tasks_set_completed_at
  BEFORE INSERT OR UPDATE OF status ON public.admin_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.admin_tasks_set_completed_at();

COMMENT ON FUNCTION public.admin_tasks_set_completed_at() IS
  'Sets completed_at when status becomes done; clears it when reopened.';

-- Backfill existing done tasks missing completed_at from updated_at
UPDATE public.admin_tasks
SET completed_at = COALESCE(updated_at, created_at, now())
WHERE status = 'done'
  AND completed_at IS NULL
  AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS admin_tasks_completed_at_idx
  ON public.admin_tasks (completed_at)
  WHERE deleted_at IS NULL AND status = 'done' AND completed_at IS NOT NULL;

-- ── admin_objectives.target_share / target_group / effect_metric_key ─────
ALTER TABLE public.admin_objectives
  ADD COLUMN IF NOT EXISTS target_share numeric(5, 2);

ALTER TABLE public.admin_objectives
  ADD COLUMN IF NOT EXISTS target_group text;

ALTER TABLE public.admin_objectives
  ADD COLUMN IF NOT EXISTS effect_metric_key text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'admin_objectives_target_share_check'
  ) THEN
    ALTER TABLE public.admin_objectives
      ADD CONSTRAINT admin_objectives_target_share_check
      CHECK (
        target_share IS NULL
        OR (target_share >= 0 AND target_share <= 100)
      );
  END IF;
END $$;

COMMENT ON COLUMN public.admin_objectives.target_share IS
  'Target share of period points (0–100). When target_group is set, this is the group share shared by all members.';
COMMENT ON COLUMN public.admin_objectives.target_group IS
  'Optional group key (e.g. 4-6). Members share one target_share; UI shows group summary row.';
COMMENT ON COLUMN public.admin_objectives.effect_metric_key IS
  'Optional effect metric id (e.g. checkout_completion_rate). No live source yet — UI shows Exempeldata / ej kopplat.';

REVOKE EXECUTE ON FUNCTION public.admin_tasks_set_completed_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_tasks_set_completed_at() TO service_role;
