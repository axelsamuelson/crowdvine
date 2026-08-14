-- Optional contact email/phone on producers (admin form).
-- contact_email may already exist on some environments; add contact_phone.

ALTER TABLE producers
  ADD COLUMN IF NOT EXISTS contact_email TEXT;

ALTER TABLE producers
  ADD COLUMN IF NOT EXISTS contact_phone TEXT;

COMMENT ON COLUMN producers.contact_email IS
  'Optional producer contact email (admin / ops). Not required at create.';

COMMENT ON COLUMN producers.contact_phone IS
  'Optional producer contact phone (admin / ops). Not required at create.';
