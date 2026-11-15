-- Driftöversikt v6: company-scoped objectives, initiatives tree, task.initiative_id.
-- Additive / idempotent. Does not backfill production data.
-- RLS: admin_initiatives is service-role only, same pattern as other admin_* tables.

-- ── admin_objectives: company, sort_order, priority, owner, short_label ──
ALTER TABLE public.admin_objectives
  ADD COLUMN IF NOT EXISTS company text;

ALTER TABLE public.admin_objectives
  ADD COLUMN IF NOT EXISTS sort_order integer;

ALTER TABLE public.admin_objectives
  ADD COLUMN IF NOT EXISTS priority text;

ALTER TABLE public.admin_objectives
  ADD COLUMN IF NOT EXISTS owner text;

ALTER TABLE public.admin_objectives
  ADD COLUMN IF NOT EXISTS short_label text;

UPDATE public.admin_objectives
SET company = 'pact'
WHERE company IS NULL;

UPDATE public.admin_objectives
SET sort_order = 0
WHERE sort_order IS NULL;

UPDATE public.admin_objectives
SET priority = 'medium'
WHERE priority IS NULL;

ALTER TABLE public.admin_objectives
  ALTER COLUMN company SET DEFAULT 'pact';

ALTER TABLE public.admin_objectives
  ALTER COLUMN sort_order SET DEFAULT 0;

ALTER TABLE public.admin_objectives
  ALTER COLUMN priority SET DEFAULT 'medium';

ALTER TABLE public.admin_objectives
  ALTER COLUMN company SET NOT NULL;

ALTER TABLE public.admin_objectives
  ALTER COLUMN sort_order SET NOT NULL;

ALTER TABLE public.admin_objectives
  ALTER COLUMN priority SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'admin_objectives_company_check'
  ) THEN
    ALTER TABLE public.admin_objectives
      ADD CONSTRAINT admin_objectives_company_check
      CHECK (company IN ('pact', 'dirtywine'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'admin_objectives_priority_check'
  ) THEN
    ALTER TABLE public.admin_objectives
      ADD CONSTRAINT admin_objectives_priority_check
      CHECK (priority IN ('urgent', 'high', 'medium', 'low'));
  END IF;
END $$;

COMMENT ON COLUMN public.admin_objectives.company IS
  'Owning company for Drift trees: pact | dirtywine.';
COMMENT ON COLUMN public.admin_objectives.sort_order IS
  'Rank within company (1..n). Displayed as Mål-rang.';
COMMENT ON COLUMN public.admin_objectives.priority IS
  'urgent | high | medium | low. Inherited by tasks; not stored on tasks for Drift.';
COMMENT ON COLUMN public.admin_objectives.owner IS
  'Human owner display name (e.g. Pierre, Léa).';
COMMENT ON COLUMN public.admin_objectives.short_label IS
  'Short chip label (e.g. Checkout, Trafik).';

CREATE INDEX IF NOT EXISTS admin_objectives_company_sort_idx
  ON public.admin_objectives (company, sort_order)
  WHERE deleted_at IS NULL;

-- ── admin_initiatives (new; leaves admin_projects untouched) ─────────────
CREATE TABLE IF NOT EXISTS public.admin_initiatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id uuid NOT NULL REFERENCES public.admin_objectives(id) ON DELETE CASCADE,
  company text NOT NULL DEFAULT 'pact',
  key text NOT NULL,
  title text NOT NULL,
  owner_agent text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_initiatives_company_check
    CHECK (company IN ('pact', 'dirtywine')),
  CONSTRAINT admin_initiatives_status_check
    CHECK (status IN ('active', 'paused', 'done', 'archived'))
);

COMMENT ON TABLE public.admin_initiatives IS
  'Drift v6 initiatives under an objective. Replaces projects in the Drift UI; admin_projects kept for rollback.';

CREATE UNIQUE INDEX IF NOT EXISTS admin_initiatives_objective_key_uidx
  ON public.admin_initiatives (objective_id, key);

CREATE INDEX IF NOT EXISTS admin_initiatives_objective_sort_idx
  ON public.admin_initiatives (objective_id, sort_order);

CREATE INDEX IF NOT EXISTS admin_initiatives_company_idx
  ON public.admin_initiatives (company);

CREATE INDEX IF NOT EXISTS admin_initiatives_owner_agent_idx
  ON public.admin_initiatives (owner_agent);

CREATE OR REPLACE FUNCTION public.set_admin_initiatives_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS admin_initiatives_updated_at ON public.admin_initiatives;
CREATE TRIGGER admin_initiatives_updated_at
  BEFORE UPDATE ON public.admin_initiatives
  FOR EACH ROW
  EXECUTE FUNCTION public.set_admin_initiatives_updated_at();

ALTER TABLE public.admin_initiatives ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.admin_initiatives FROM anon, authenticated;
GRANT ALL ON public.admin_initiatives TO service_role;

-- ── admin_tasks.initiative_id ────────────────────────────────────────────
ALTER TABLE public.admin_tasks
  ADD COLUMN IF NOT EXISTS initiative_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'admin_tasks_initiative_id_fkey'
  ) THEN
    ALTER TABLE public.admin_tasks
      ADD CONSTRAINT admin_tasks_initiative_id_fkey
      FOREIGN KEY (initiative_id)
      REFERENCES public.admin_initiatives(id)
      ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.admin_tasks.initiative_id IS
  'Optional Drift v6 initiative. Missing initiative (or objective) → Ej prioriterad.';

CREATE INDEX IF NOT EXISTS admin_tasks_initiative_id_idx
  ON public.admin_tasks (initiative_id)
  WHERE deleted_at IS NULL AND initiative_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS admin_tasks_initiative_sort_idx
  ON public.admin_tasks (initiative_id, sort_order)
  WHERE deleted_at IS NULL AND initiative_id IS NOT NULL;
