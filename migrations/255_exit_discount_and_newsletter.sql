-- Exit-intent 10% discount leads + newsletter consent storage.
-- Not linked to exit_feedback. No anon RLS access; inserts via server routes.

CREATE TABLE IF NOT EXISTS public.exit_discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  email text NOT NULL,
  code text NOT NULL,
  promo_discount_code_id uuid REFERENCES public.promo_discount_codes(id) ON DELETE SET NULL,
  age_confirmed_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  redeemed_at timestamptz,
  CONSTRAINT exit_discount_codes_code_unique UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_exit_discount_codes_email
  ON public.exit_discount_codes (lower(email));

CREATE INDEX IF NOT EXISTS idx_exit_discount_codes_created_at
  ON public.exit_discount_codes (created_at);

CREATE INDEX IF NOT EXISTS idx_exit_discount_codes_unused_retention
  ON public.exit_discount_codes (created_at)
  WHERE redeemed_at IS NULL;

COMMENT ON TABLE public.exit_discount_codes IS
  'Exit-popup 10% first-order discount leads. Email retained until redeem or retention cron.';

CREATE TABLE IF NOT EXISTS public.newsletter_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  email text NOT NULL,
  consented_at timestamptz NOT NULL DEFAULT now(),
  text_version text NOT NULL,
  source text NOT NULL DEFAULT 'exit_popup'
    CHECK (source IN ('exit_popup')),
  unsubscribed_at timestamptz,
  CONSTRAINT newsletter_consents_email_source_unique UNIQUE (email, source)
);

CREATE INDEX IF NOT EXISTS idx_newsletter_consents_email
  ON public.newsletter_consents (lower(email));

COMMENT ON TABLE public.newsletter_consents IS
  'Newsletter opt-ins (separate from exit discount). Unsubscribe via signed token route.';

ALTER TABLE public.exit_discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_consents ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated — service_role only via server routes.
DROP POLICY IF EXISTS "Admins can select exit_discount_codes" ON public.exit_discount_codes;
CREATE POLICY "Admins can select exit_discount_codes"
  ON public.exit_discount_codes
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Admins can select newsletter_consents" ON public.newsletter_consents;
CREATE POLICY "Admins can select newsletter_consents"
  ON public.newsletter_consents
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

GRANT ALL ON public.exit_discount_codes TO service_role;
GRANT ALL ON public.newsletter_consents TO service_role;
GRANT SELECT ON public.exit_discount_codes TO authenticated;
GRANT SELECT ON public.newsletter_consents TO authenticated;
