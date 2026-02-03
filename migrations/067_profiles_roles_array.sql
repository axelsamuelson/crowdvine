-- Multiple roles per user: user, admin, producer (platform roles). At least one.
-- portal_access (066) stays: user = B2C, business = B2B.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS roles text[] DEFAULT ARRAY['user'];

COMMENT ON COLUMN profiles.roles IS 'Platform roles: ''user'', ''admin'', ''producer''. User can have multiple. Default [''user''].';

-- Backfill from existing role column
UPDATE profiles
SET roles = ARRAY[COALESCE(role, 'user')]
WHERE roles IS NULL OR array_length(roles, 1) IS NULL;

-- Ensure no nulls
UPDATE profiles SET roles = ARRAY['user'] WHERE roles IS NULL;
