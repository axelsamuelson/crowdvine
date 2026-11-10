-- Marketing consent for "new pallets opening" emails.
-- Legal: store timestamp, text version id, email (+ user id), withdrawal timestamp.
-- Purpose scoped to new_pallet_open only.
-- Axel approved applying on 2026-11-10 (test first, then prod by Hugo).

-- ---------------------------------------------------------------------------
-- marketing_consents
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.marketing_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  email text NOT NULL,
  purpose text NOT NULL DEFAULT 'new_pallet_open'
    CHECK (purpose = 'new_pallet_open'),
  text_version_id text NOT NULL,
  consented_at timestamptz NOT NULL DEFAULT now(),
  withdrawn_at timestamptz,
  unsubscribe_token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS marketing_consents_email_purpose_active_uidx
  ON public.marketing_consents (lower(email), purpose)
  WHERE withdrawn_at IS NULL;

CREATE INDEX IF NOT EXISTS marketing_consents_purpose_active_idx
  ON public.marketing_consents (purpose)
  WHERE withdrawn_at IS NULL;

CREATE INDEX IF NOT EXISTS marketing_consents_user_id_idx
  ON public.marketing_consents (user_id)
  WHERE user_id IS NOT NULL;

COMMENT ON TABLE public.marketing_consents IS
  'Opt-in for new-pallet-opening emails (purpose=new_pallet_open). One active row per email+purpose.';
COMMENT ON COLUMN public.marketing_consents.text_version_id IS
  'Stable id of the exact consent checkbox copy shown to the customer.';
COMMENT ON COLUMN public.marketing_consents.unsubscribe_token IS
  'Opaque one-click unsubscribe token (never the email itself).';
COMMENT ON COLUMN public.marketing_consents.withdrawn_at IS
  'Set by one-click unsubscribe; excludes recipient from future mailings.';

ALTER TABLE public.marketing_consents ENABLE ROW LEVEL SECURITY;

-- Users may read/update only their own rows (by auth.uid()).
DROP POLICY IF EXISTS marketing_consents_select_own ON public.marketing_consents;
CREATE POLICY marketing_consents_select_own
  ON public.marketing_consents
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS marketing_consents_insert_own ON public.marketing_consents;
CREATE POLICY marketing_consents_insert_own
  ON public.marketing_consents
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS marketing_consents_update_own ON public.marketing_consents;
CREATE POLICY marketing_consents_update_own
  ON public.marketing_consents
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role / server routes bypass RLS via supabaseAdmin.
