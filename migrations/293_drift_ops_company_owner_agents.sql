-- Driftöversikt data model (additive only; no backfill).
-- company on projects; optional company/project_id on ops log/queue;
-- owner_agent on tasks; ops_agents registry.

-- ── admin_projects.company ───────────────────────────────────────────────
ALTER TABLE public.admin_projects
  ADD COLUMN IF NOT EXISTS company text;

UPDATE public.admin_projects
SET company = 'pact'
WHERE company IS NULL;

ALTER TABLE public.admin_projects
  ALTER COLUMN company SET DEFAULT 'pact';

ALTER TABLE public.admin_projects
  ALTER COLUMN company SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'admin_projects_company_check'
  ) THEN
    ALTER TABLE public.admin_projects
      ADD CONSTRAINT admin_projects_company_check
      CHECK (company IN ('pact', 'dirtywine'));
  END IF;
END $$;

COMMENT ON COLUMN public.admin_projects.company IS
  'Owning company for Drift filters: pact | dirtywine. Display as PACT / Dirty Wine.';

-- ── admin_tasks.owner_agent ──────────────────────────────────────────────
ALTER TABLE public.admin_tasks
  ADD COLUMN IF NOT EXISTS owner_agent text;

COMMENT ON COLUMN public.admin_tasks.owner_agent IS
  'Bot display name owning the task (matches ops_agents.name). Humans stay on assigned_to.';

CREATE INDEX IF NOT EXISTS admin_tasks_owner_agent_idx
  ON public.admin_tasks (owner_agent)
  WHERE owner_agent IS NOT NULL AND deleted_at IS NULL;

-- ── ops_agent_log optional company + project_id ──────────────────────────
ALTER TABLE public.ops_agent_log
  ADD COLUMN IF NOT EXISTS company text;

ALTER TABLE public.ops_agent_log
  ADD COLUMN IF NOT EXISTS project_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ops_agent_log_company_check'
  ) THEN
    ALTER TABLE public.ops_agent_log
      ADD CONSTRAINT ops_agent_log_company_check
      CHECK (company IS NULL OR company IN ('pact', 'dirtywine'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ops_agent_log_project_id_fkey'
  ) THEN
    ALTER TABLE public.ops_agent_log
      ADD CONSTRAINT ops_agent_log_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES public.admin_projects(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ops_agent_log_project_id_idx
  ON public.ops_agent_log (project_id)
  WHERE project_id IS NOT NULL;

-- ── ops_approval_queue optional company + project_id ─────────────────────
ALTER TABLE public.ops_approval_queue
  ADD COLUMN IF NOT EXISTS company text;

ALTER TABLE public.ops_approval_queue
  ADD COLUMN IF NOT EXISTS project_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ops_approval_queue_company_check'
  ) THEN
    ALTER TABLE public.ops_approval_queue
      ADD CONSTRAINT ops_approval_queue_company_check
      CHECK (company IS NULL OR company IN ('pact', 'dirtywine'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ops_approval_queue_project_id_fkey'
  ) THEN
    ALTER TABLE public.ops_approval_queue
      ADD CONSTRAINT ops_approval_queue_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES public.admin_projects(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ops_approval_queue_project_id_idx
  ON public.ops_approval_queue (project_id)
  WHERE project_id IS NOT NULL;

-- ── ops_agents registry ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ops_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  agent_id text NOT NULL,
  company text,
  area text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ops_agents_agent_id_unique UNIQUE (agent_id),
  CONSTRAINT ops_agents_company_check
    CHECK (company IS NULL OR company IN ('pact', 'dirtywine', 'both'))
);

COMMENT ON TABLE public.ops_agents IS
  'Bot registry for Driftöversikt. Jobbar på / Väntar på are derived, not stored.';

ALTER TABLE public.ops_agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage ops_agents" ON public.ops_agents;
CREATE POLICY "Admins manage ops_agents"
  ON public.ops_agents
  FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

REVOKE ALL ON public.ops_agents FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ops_agents TO authenticated;
GRANT ALL ON public.ops_agents TO service_role;
