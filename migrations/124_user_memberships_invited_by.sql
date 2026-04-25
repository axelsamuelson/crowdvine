-- Track which user invited this member (used by checkout second-order IP path).

ALTER TABLE user_memberships
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_user_memberships_invited_by
  ON user_memberships(invited_by)
  WHERE invited_by IS NOT NULL;
