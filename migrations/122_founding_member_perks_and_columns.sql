-- Founding Member: SQL that references the enum value (run AFTER 121 has committed).
-- get_level_from_points unchanged — founding_member is not assigned from IP alone.

-- Invite quota for founding_member (same as privilege)
CREATE OR REPLACE FUNCTION get_invite_quota_for_level(lvl membership_level)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE lvl
    WHEN 'requester' THEN 0
    WHEN 'basic' THEN 2
    WHEN 'brons' THEN 5
    WHEN 'silver' THEN 12
    WHEN 'guld' THEN 50
    WHEN 'privilege' THEN 100
    WHEN 'founding_member' THEN 100
    WHEN 'admin' THEN 999999
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Perks for founding_member (pattern from 071b / 040b)
INSERT INTO membership_perks (level, perk_type, perk_value, description, sort_order, is_active)
VALUES
  ('founding_member', 'discount', '15%', 'Founding Member permanent discount', 10, true),
  ('founding_member', 'invite_quota', '100', 'Founding Member invite quota', 1, true)
ON CONFLICT (level, perk_type) DO NOTHING;

-- Tracking columns (half-year bottle counters + audit timestamp)
ALTER TABLE user_memberships
  ADD COLUMN IF NOT EXISTS founding_member_since TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS founding_member_bottles_h1 INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS founding_member_bottles_h2 INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS founding_member_last_activity_check TIMESTAMPTZ;

COMMENT ON COLUMN user_memberships.founding_member_since IS
  'When founding_member status was granted; NULL if not a founding member.';
COMMENT ON COLUMN user_memberships.founding_member_bottles_h1 IS
  'Bottle count Jan–Jun half; reset by scheduled job.';
COMMENT ON COLUMN user_memberships.founding_member_bottles_h2 IS
  'Bottle count Jul–Dec half; reset by scheduled job.';
COMMENT ON COLUMN user_memberships.founding_member_last_activity_check IS
  'Last time half-year founding member activity was evaluated.';
