-- Analytics V2 etapp 1 — M5: invited friend profiles (H9).
-- Union of invitation_codes.used_by + referral_signups.invitee_id for three
-- canonical inviters. No emails in the view.

-- Minimal stubs so TEST (without invite tables) still accepts the view.
CREATE TABLE IF NOT EXISTS invitation_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid,
  used_by uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referral_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id uuid,
  invitee_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE OR REPLACE VIEW analytics_invited_friend_profiles AS
WITH canonical AS (
  SELECT unnest(ARRAY[
    '8aeec114-78a8-47b5-b535-12b355964933'::uuid, -- Henrik Frienholt
    'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9'::uuid, -- ave.samuelson
    'a957a784-6112-4ec9-b474-f2b025fc4fad'::uuid  -- admin@pactwines.com
  ]) AS inviter_id
),
from_codes AS (
  SELECT DISTINCT ic.used_by AS profile_id
  FROM invitation_codes ic
  JOIN canonical c ON c.inviter_id = ic.created_by
  WHERE ic.used_by IS NOT NULL
),
from_referrals AS (
  SELECT DISTINCT rs.invitee_id AS profile_id
  FROM referral_signups rs
  JOIN canonical c ON c.inviter_id = rs.inviter_id
  WHERE rs.invitee_id IS NOT NULL
)
SELECT profile_id FROM from_codes
UNION
SELECT profile_id FROM from_referrals;

COMMENT ON VIEW analytics_invited_friend_profiles IS
  'Profiles invited by the three canonical PACT inviters (H9). No emails.';

REVOKE ALL ON analytics_invited_friend_profiles FROM PUBLIC, anon;
GRANT SELECT ON analytics_invited_friend_profiles TO service_role;
GRANT SELECT ON analytics_invited_friend_profiles TO authenticated;
