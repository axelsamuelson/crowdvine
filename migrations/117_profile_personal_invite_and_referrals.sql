-- Personal invite slug (stable URL segment) + referral signup tracking for permanent /i/[code] links.

-- Stable public code for /i/{personal_invite_code} (not the same as legacy one-off invitation rows).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS personal_invite_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_personal_invite_code_unique
  ON profiles (lower(trim(personal_invite_code)))
  WHERE personal_invite_code IS NOT NULL AND btrim(personal_invite_code) <> '';

COMMENT ON COLUMN profiles.personal_invite_code IS
  'Stable slug for permanent invite URL /i/{code}. Generated once; case-insensitive uniqueness enforced via index.';

-- Master pool row in invitation_codes uses the same code string with is_personal_link = true (redeem does not consume it).
ALTER TABLE invitation_codes
  ADD COLUMN IF NOT EXISTS is_personal_link BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS referral_activated_at TIMESTAMPTZ;

COMMENT ON COLUMN invitation_codes.is_personal_link IS
  'When true, this code is the inviter''s reusable personal link; redeem must not mark it used/deactivated.';

COMMENT ON COLUMN invitation_codes.referral_activated_at IS
  'Optional timestamp on a specific invitation row; primary activation tracking is referral_signups.referral_activated_at.';

CREATE TABLE IF NOT EXISTS referral_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  personal_invite_code TEXT NOT NULL,
  signed_up_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  referral_activated_at TIMESTAMPTZ,
  first_order_reservation_id UUID REFERENCES order_reservations(id) ON DELETE SET NULL,
  CONSTRAINT referral_signups_invitee_unique UNIQUE (invitee_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_signups_inviter ON referral_signups(inviter_id);
CREATE INDEX IF NOT EXISTS idx_referral_signups_activated ON referral_signups(inviter_id)
  WHERE referral_activated_at IS NOT NULL;

COMMENT ON TABLE referral_signups IS
  'One row per invitee who signed up via an inviter''s personal link; referral_activated_at set on first qualifying order (see checkout).';
