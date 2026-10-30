-- Add structured reason codes to exit_feedback; free-text answer becomes optional.
-- answer is used mainly when reason = 'other' (optional free text still allowed).

ALTER TABLE public.exit_feedback
  ADD COLUMN IF NOT EXISTS reason text;

ALTER TABLE public.exit_feedback
  ALTER COLUMN answer DROP NOT NULL;

-- Backfill any pre-reason rows so the check constraint can be applied.
UPDATE public.exit_feedback
SET reason = 'other'
WHERE reason IS NULL;

ALTER TABLE public.exit_feedback
  ALTER COLUMN reason SET NOT NULL;

ALTER TABLE public.exit_feedback
  DROP CONSTRAINT IF EXISTS exit_feedback_reason_check;

ALTER TABLE public.exit_feedback
  ADD CONSTRAINT exit_feedback_reason_check
  CHECK (
    reason IN (
      'min_6_bottles',
      'price',
      'delivery_unclear',
      'wait_too_long',
      'just_browsing',
      'other'
    )
  );

CREATE INDEX IF NOT EXISTS idx_exit_feedback_reason
  ON public.exit_feedback (reason);

COMMENT ON COLUMN public.exit_feedback.reason IS
  'Structured exit reason code (radio choice).';

COMMENT ON COLUMN public.exit_feedback.answer IS
  'Optional free text; primarily for reason=other. No PII.';

COMMENT ON TABLE public.exit_feedback IS
  'Anonymous exit-intent feedback (reason + optional answer). No PII. Insert via validated API; anon SELECT denied.';
