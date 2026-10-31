-- Persist exit-feedback completion on the user profile so answered users
-- never see the popup again across devices/browsers when logged in.
-- Idempotent: safe to re-run (IF NOT EXISTS).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS exit_feedback_answered_at timestamptz;

COMMENT ON COLUMN public.profiles.exit_feedback_answered_at IS
  'Set when the user submits the exit-feedback popup; suppresses future prompts while logged in.';

CREATE INDEX IF NOT EXISTS idx_profiles_exit_feedback_answered_at
  ON public.profiles (exit_feedback_answered_at)
  WHERE exit_feedback_answered_at IS NOT NULL;
