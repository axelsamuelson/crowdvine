-- Retire `admin` as a user_memberships.level value.
-- Platform staff use profiles.role / profiles.roles = 'admin' only.
-- Former admin tier users map to privilege (top consumer tier).

UPDATE user_memberships
SET
  level = 'privilege',
  updated_at = NOW()
WHERE level = 'admin';

-- Legacy perk rows for tier "admin" — privilege tier owns top-tier perks
DELETE FROM membership_perks
WHERE level = 'admin';
