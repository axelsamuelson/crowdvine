-- Migration 154: User-preferred UI locale (en | sv) for PACT shopping context.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferred_locale TEXT;

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_preferred_locale_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_preferred_locale_check CHECK (
    preferred_locale IS NULL OR preferred_locale IN ('en', 'sv')
  );

COMMENT ON COLUMN profiles.preferred_locale IS
  'User-chosen UI language (en/sv). NULL = derive from market + cookie on next visit.';
