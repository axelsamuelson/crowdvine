-- Portal access: which portals the user can use (B2C = pactwines.com, B2B = dirtywine.se)
-- 'user' = B2C only, 'business' = B2B only, both = can switch via toggle
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS portal_access text[] DEFAULT ARRAY['user'];

COMMENT ON COLUMN profiles.portal_access IS 'Allowed portals: ''user'' (B2C/pactwines.com), ''business'' (B2B/dirtywine.se). Default [''user''] for B2C only.';

-- Ensure existing rows have default (only if column was just added and null)
UPDATE profiles SET portal_access = ARRAY['user'] WHERE portal_access IS NULL;

-- To give a user access to both B2C and B2B (show toggle):
--   UPDATE profiles SET portal_access = ARRAY['user', 'business'] WHERE id = '<user_id>';
-- To make a user B2B-only (dirtywine.se only, no toggle):
--   UPDATE profiles SET portal_access = ARRAY['business'] WHERE id = '<user_id>';
