-- Migration 297: Systembolaget curated verification columns + Lucien ops agent.
-- Already applied in production. Repo copy for history only — do NOT re-run
-- against prod/staging from agents.
--
-- Note: numbering is 297 because migrations/296_admin_analytics_perf_indexes.sql
-- already exists on main. Content matches the verification schema live in prod.

ALTER TABLE public.systembolaget_curated
  ADD COLUMN IF NOT EXISTS sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by text,
  ADD COLUMN IF NOT EXISTS fact_sheet jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'systembolaget_curated_verification_status_check'
  ) THEN
    ALTER TABLE public.systembolaget_curated
      ADD CONSTRAINT systembolaget_curated_verification_status_check
      CHECK (
        verification_status = ANY (
          ARRAY[
            'unverified'::text,
            'verified'::text,
            'rejected'::text,
            'needs_review'::text
          ]
        )
      );
  END IF;
END $$;

ALTER TABLE public.systembolaget_curated
  ALTER COLUMN editorial_note_sv SET DEFAULT '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'systembolaget_curated_published_needs_note'
  ) THEN
    ALTER TABLE public.systembolaget_curated
      ADD CONSTRAINT systembolaget_curated_published_needs_note
      CHECK (
        (NOT is_published) OR (length(btrim(editorial_note_sv)) > 0)
      );
  END IF;
END $$;

INSERT INTO public.ops_agents (name, agent_id, company, area, active)
SELECT
  'Lucien',
  '1d68953f-6e2b-4fb1-a1a3-cb935b27237d',
  'pact',
  'Vinexpert',
  true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.ops_agents
  WHERE agent_id = '1d68953f-6e2b-4fb1-a1a3-cb935b27237d'
     OR name = 'Lucien'
);
