-- Country register for Ship to, plus waitlist signups.
-- A country missing from this table is waitlist / 18 / EUR in application code.
-- US stays waitlist here so conditional_reservation cannot be reached from checkout.

CREATE TABLE IF NOT EXISTS public.countries (
  country_code char(2) PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('live', 'waitlist', 'blocked')),
  age_minimum integer NOT NULL CHECK (age_minimum >= 0),
  display_currency char(3) NOT NULL,
  notes text,
  CONSTRAINT countries_country_code_upper CHECK (country_code = upper(country_code)),
  CONSTRAINT countries_currency_upper CHECK (display_currency = upper(display_currency))
);

COMMENT ON TABLE public.countries IS
  'Ship-to register. status=live is the only value that may create a checkout intent.';

INSERT INTO public.countries (country_code, status, age_minimum, display_currency, notes)
VALUES
  ('SE', 'live', 20, 'SEK', 'Only live checkout market in this phase'),
  ('US', 'waitlist', 21, 'USD', 'conditional_reservation remains in code but is unreachable'),
  ('GB', 'waitlist', 18, 'GBP', NULL),
  ('CA', 'waitlist', 19, 'CAD', NULL),
  ('AU', 'waitlist', 18, 'AUD', NULL),
  ('NO', 'waitlist', 18, 'NOK', NULL),
  ('DE', 'waitlist', 18, 'EUR', NULL),
  ('FR', 'waitlist', 18, 'EUR', NULL),
  ('ES', 'waitlist', 18, 'EUR', NULL),
  ('NL', 'waitlist', 18, 'EUR', NULL)
ON CONFLICT (country_code) DO UPDATE
SET
  status = EXCLUDED.status,
  age_minimum = EXCLUDED.age_minimum,
  display_currency = EXCLUDED.display_currency,
  notes = EXCLUDED.notes;

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can select countries" ON public.countries;
CREATE POLICY "Admins can select countries"
  ON public.countries
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

GRANT SELECT ON public.countries TO authenticated;

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
