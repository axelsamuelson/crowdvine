-- Allow multiple invitation types and let admin decide if user can change type on invite page.
-- allowed_types: array of types the user can sign up as (consumer, producer, business)
-- can_change_account_type: if true, user can switch between allowed types on the invite page

ALTER TABLE invitation_codes
  ADD COLUMN IF NOT EXISTS allowed_types text[] DEFAULT ARRAY['consumer']::text[],
  ADD COLUMN IF NOT EXISTS can_change_account_type boolean NOT NULL DEFAULT false;

-- Migrate existing invitation_type to allowed_types
UPDATE invitation_codes
SET allowed_types = ARRAY[invitation_type]::text[]
WHERE allowed_types IS NULL AND invitation_type IS NOT NULL;

-- Ensure at least consumer for any null
UPDATE invitation_codes
SET allowed_types = ARRAY['consumer']::text[]
WHERE allowed_types IS NULL OR array_length(allowed_types, 1) IS NULL;

-- Set default for future inserts (in case column existed without default)
ALTER TABLE invitation_codes
  ALTER COLUMN allowed_types SET DEFAULT ARRAY['consumer']::text[];

-- Add check constraint for allowed_types
ALTER TABLE invitation_codes
  DROP CONSTRAINT IF EXISTS invitation_codes_allowed_types_check;

ALTER TABLE invitation_codes
  ADD CONSTRAINT invitation_codes_allowed_types_check
  CHECK (
    allowed_types IS NOT NULL
    AND array_length(allowed_types, 1) >= 1
    AND allowed_types <@ ARRAY['consumer', 'producer', 'business']::text[]
  );

COMMENT ON COLUMN invitation_codes.allowed_types IS 'Types the invited user can sign up as. At least one required.';
COMMENT ON COLUMN invitation_codes.can_change_account_type IS 'If true, user can change their account type on the invite page before signing up.';
