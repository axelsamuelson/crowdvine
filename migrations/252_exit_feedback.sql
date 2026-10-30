-- Anonymous exit-intent / abandoned-cart feedback.
-- Stores only: answer, step, page path, session_id, is_internal, created_at.
-- No PII (no email, name, IP, user_id). Anon may INSERT only; no SELECT for anon.

CREATE TABLE IF NOT EXISTS public.exit_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  session_id text NOT NULL,
  step text NOT NULL CHECK (step IN ('checkout', 'cart')),
  page text NOT NULL,
  answer text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_exit_feedback_created_at
  ON public.exit_feedback (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_exit_feedback_session_id
  ON public.exit_feedback (session_id);

COMMENT ON TABLE public.exit_feedback IS
  'Anonymous exit-intent feedback. No PII. Insert via validated API; anon SELECT denied.';

ALTER TABLE public.exit_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon can insert exit_feedback" ON public.exit_feedback;
CREATE POLICY "Anon can insert exit_feedback"
  ON public.exit_feedback
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can select exit_feedback" ON public.exit_feedback;
CREATE POLICY "Admins can select exit_feedback"
  ON public.exit_feedback
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

GRANT INSERT ON public.exit_feedback TO anon, authenticated;
GRANT SELECT ON public.exit_feedback TO authenticated;
GRANT ALL ON public.exit_feedback TO service_role;
