-- crowdvine-checkout-audit ONLY (ref msdfjrrokcmjifetuwgc).
-- Minimal user_memberships so middleware + checkout can treat the synthetic
-- user as a non-requester member. NOT a production dump.
-- Idempotent. NEVER apply to abrnvjqwpdkodgrtezeg.

DO $$
BEGIN
  IF (
    SELECT value FROM checkout_audit_meta WHERE key = 'project_ref'
  ) IS DISTINCT FROM 'msdfjrrokcmjifetuwgc' THEN
    RAISE EXCEPTION 'REFUSED: wrong project_ref for membership gate';
  END IF;
END $$;

-- Use TEXT + CHECK instead of prod ENUM so this fixture stays self-contained.
CREATE TABLE IF NOT EXISTS user_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  level TEXT NOT NULL DEFAULT 'basic'
    CHECK (
      level IN (
        'requester',
        'basic',
        'brons',
        'silver',
        'guld',
        'privilege',
        'founding_member',
        'admin'
      )
    ),
  impact_points INTEGER NOT NULL DEFAULT 0,
  invite_quota_monthly INTEGER NOT NULL DEFAULT 0,
  invites_used_this_month INTEGER NOT NULL DEFAULT 0,
  stripe_customer_id TEXT,
  last_quota_reset TIMESTAMPTZ DEFAULT now(),
  level_assigned_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_user_memberships_user_id
  ON user_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_user_memberships_level
  ON user_memberships(level);

ALTER TABLE user_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_user_memberships_select_own ON user_memberships;
CREATE POLICY audit_user_memberships_select_own ON user_memberships
  FOR SELECT USING (auth.uid() = user_id);

INSERT INTO checkout_audit_meta (key, value) VALUES
  ('schema_membership_gate', now()::text)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
