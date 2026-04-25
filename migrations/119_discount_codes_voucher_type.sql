-- Classify discount_codes rows and constrain voucher_type for milestone minting.

ALTER TABLE discount_codes
  ADD COLUMN IF NOT EXISTS voucher_type TEXT NOT NULL DEFAULT 'invitation_reward';

UPDATE discount_codes
SET voucher_type = 'invitation_reward'
WHERE earned_for_invitation_id IS NOT NULL;

UPDATE discount_codes
SET voucher_type = 'unknown'
WHERE earned_for_invitation_id IS NULL;

ALTER TABLE discount_codes
  ADD CONSTRAINT discount_codes_voucher_type_check
  CHECK (voucher_type IN ('milestone', 'invitation_reward', 'unknown'));
