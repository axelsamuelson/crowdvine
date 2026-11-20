-- Migration 298: Allow verdict 'candidate' on systembolaget_curated.
-- Already applied in production. Repo copy for history only — do NOT re-run
-- against prod/staging from agents.
--
-- Note: user brief named this 297; repo uses 298 because 297 is the
-- verification migration that documents the earlier prod change.

ALTER TABLE public.systembolaget_curated
  DROP CONSTRAINT IF EXISTS sb_curated_verdict_chk;

ALTER TABLE public.systembolaget_curated
  ADD CONSTRAINT sb_curated_verdict_chk
  CHECK (
    verdict = ANY (
      ARRAY[
        'recommended'::text,
        'avoid'::text,
        'skipped'::text,
        'candidate'::text
      ]
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'systembolaget_curated_candidate_unpublished'
  ) THEN
    ALTER TABLE public.systembolaget_curated
      ADD CONSTRAINT systembolaget_curated_candidate_unpublished
      CHECK (NOT (is_published AND verdict = 'candidate'));
  END IF;
END $$;
