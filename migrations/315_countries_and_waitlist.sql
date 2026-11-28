-- Waitlist signups and the profile Ship to column.
--
-- Ship-to policy (live / waitlist / age / currency) lives in
-- lib/market/country-registry.ts. Do not alter the producer country
-- list from migrations 078 and 220. A later database register must be
-- a new table, ship_to_countries.
--
-- waitlist_signups and profiles.ship_to_country_code are already applied
-- in production. The statements below stay idempotent for a re-run.

CREATE TABLE IF NOT EXISTS public.waitlist_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  country_code char(2) NOT NULL,
  locale text NOT NULL,
  cart_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  newsletter_opt_in boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT waitlist_signups_email_country UNIQUE (email, country_code),
  CONSTRAINT waitlist_signups_country_upper CHECK (country_code = upper(country_code))
);

CREATE INDEX IF NOT EXISTS idx_waitlist_signups_country
  ON public.waitlist_signups (country_code, created_at DESC);

COMMENT ON TABLE public.waitlist_signups IS
  'Waitlist for countries that are not live. Email lives here, never in user_events.';

ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can select waitlist_signups" ON public.waitlist_signups;
CREATE POLICY "Admins can select waitlist_signups"
  ON public.waitlist_signups
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

GRANT SELECT ON public.waitlist_signups TO authenticated;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ship_to_country_code char(2);

COMMENT ON COLUMN public.profiles.ship_to_country_code IS
  'Customer Ship to country. Cookie pact_ship_to is the request source of truth.';
