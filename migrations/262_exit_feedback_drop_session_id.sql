-- Remove session_id from exit_feedback so answers are not linkable to a
-- browser session. Null existing values, then drop index + column.
-- Reconfirm RLS: anon/authenticated INSERT only; SELECT for platform admins.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'exit_feedback'
      AND column_name = 'session_id'
  ) THEN
    ALTER TABLE public.exit_feedback
      ALTER COLUMN session_id DROP NOT NULL;

    UPDATE public.exit_feedback
      SET session_id = NULL
      WHERE session_id IS NOT NULL;

    DROP INDEX IF EXISTS public.idx_exit_feedback_session_id;

    ALTER TABLE public.exit_feedback
      DROP COLUMN session_id;
  END IF;
END $$;

COMMENT ON TABLE public.exit_feedback IS
  'Anonymous exit-intent feedback (reason + optional answer). No PII, no session_id/user_id/visitor_id. Insert via validated API; anon SELECT denied.';

ALTER TABLE public.exit_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon can insert exit_feedback" ON public.exit_feedback;
CREATE POLICY "Anon can insert exit_feedback"
  ON public.exit_feedback
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Explicitly ensure no anon SELECT policy exists.
DROP POLICY IF EXISTS "Anon can select exit_feedback" ON public.exit_feedback;

DROP POLICY IF EXISTS "Admins can select exit_feedback" ON public.exit_feedback;
CREATE POLICY "Admins can select exit_feedback"
  ON public.exit_feedback
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

REVOKE ALL ON public.exit_feedback FROM anon;
GRANT INSERT ON public.exit_feedback TO anon, authenticated;
GRANT SELECT ON public.exit_feedback TO authenticated;
GRANT ALL ON public.exit_feedback TO service_role;
