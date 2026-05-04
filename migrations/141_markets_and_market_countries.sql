-- Migration 141: Markets + market_countries (Phase 1 — read-side architecture; SEK only for now)
-- Date: 2026-04-28
-- EU payment_capture_mode = automatic: deferred SetupIntent + auto-charge when pallet completes (no per-order admin approval).

CREATE TABLE IF NOT EXISTS markets (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  default_country_code TEXT,
  currency_code TEXT NOT NULL DEFAULT 'SEK',
  locale TEXT NOT NULL DEFAULT 'en',
  checkout_mode TEXT NOT NULL,
  payment_capture_mode TEXT NOT NULL,
  age_minimum INTEGER,
  terms_version TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT markets_checkout_mode_check CHECK (
    checkout_mode IN (
      'disabled',
      'interest_only',
      'conditional_reservation',
      'normal_checkout'
    )
  ),
  CONSTRAINT markets_payment_capture_mode_check CHECK (
    payment_capture_mode IN ('manual', 'automatic', 'admin_approved')
  )
);

COMMENT ON TABLE markets IS
  'Commercial market configuration (currency, checkout mode, capture policy). Phase 1: seeded EU + US; pricing still SEK everywhere.';

COMMENT ON COLUMN markets.payment_capture_mode IS
  'EU: automatic = off-session charge when pallet rules allow. US conditional: admin_approved = gates before first US charge.';

CREATE TABLE IF NOT EXISTS market_countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_code TEXT NOT NULL REFERENCES markets(code) ON DELETE CASCADE,
  country_code TEXT NOT NULL,
  role TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT market_countries_role_check CHECK (
    role IN (
      'browse_only',
      'checkout_eligible',
      'conditional_eligible',
      'blocked'
    )
  ),
  CONSTRAINT market_countries_country_code_upper CHECK (
    char_length(country_code) = 2 AND country_code = upper(country_code)
  ),
  CONSTRAINT market_countries_unique_market_country UNIQUE (market_code, country_code)
);

CREATE INDEX IF NOT EXISTS idx_market_countries_country_code
  ON market_countries(country_code);

CREATE INDEX IF NOT EXISTS idx_market_countries_market_code
  ON market_countries(market_code);

CREATE INDEX IF NOT EXISTS idx_market_countries_role
  ON market_countries(role);

COMMENT ON TABLE market_countries IS
  'Maps ISO 3166-1 alpha-2 countries to a market with a checkout role.';

-- Seed: EU (normal checkout)
INSERT INTO markets (
  code,
  name,
  default_country_code,
  currency_code,
  locale,
  checkout_mode,
  payment_capture_mode,
  age_minimum,
  terms_version,
  is_active
) VALUES (
  'EU',
  'Europe',
  'SE',
  'SEK',
  'en',
  'normal_checkout',
  'automatic',
  NULL,
  NULL,
  true
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  default_country_code = EXCLUDED.default_country_code,
  currency_code = EXCLUDED.currency_code,
  locale = EXCLUDED.locale,
  checkout_mode = EXCLUDED.checkout_mode,
  payment_capture_mode = EXCLUDED.payment_capture_mode,
  age_minimum = EXCLUDED.age_minimum,
  terms_version = EXCLUDED.terms_version,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Seed: US (conditional reservation; currency SEK until USD phase)
INSERT INTO markets (
  code,
  name,
  default_country_code,
  currency_code,
  locale,
  checkout_mode,
  payment_capture_mode,
  age_minimum,
  terms_version,
  is_active
) VALUES (
  'US',
  'United States',
  'US',
  'SEK',
  'en-US',
  'conditional_reservation',
  'admin_approved',
  21,
  'US_CONDITIONAL_RESERVATION_v1',
  true
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  default_country_code = EXCLUDED.default_country_code,
  currency_code = EXCLUDED.currency_code,
  locale = EXCLUDED.locale,
  checkout_mode = EXCLUDED.checkout_mode,
  payment_capture_mode = EXCLUDED.payment_capture_mode,
  age_minimum = EXCLUDED.age_minimum,
  terms_version = EXCLUDED.terms_version,
  is_active = EXCLUDED.is_active,
  updated_at = now();

INSERT INTO market_countries (market_code, country_code, role, is_default)
VALUES
  ('EU', 'SE', 'checkout_eligible', true),
  ('EU', 'NO', 'checkout_eligible', false),
  ('EU', 'DK', 'checkout_eligible', false),
  ('EU', 'FI', 'checkout_eligible', false),
  ('EU', 'DE', 'checkout_eligible', false),
  ('EU', 'FR', 'checkout_eligible', false),
  ('EU', 'GB', 'checkout_eligible', false),
  ('US', 'US', 'conditional_eligible', true)
ON CONFLICT (market_code, country_code) DO UPDATE SET
  role = EXCLUDED.role,
  is_default = EXCLUDED.is_default,
  updated_at = now();
