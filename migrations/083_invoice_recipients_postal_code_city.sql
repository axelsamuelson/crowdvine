-- Migration 083: Split address into Adress, Postnummer, Stad for invoice_recipients
-- address = street (gatuadress), postal_code = postnummer, city = stad
ALTER TABLE invoice_recipients
  ADD COLUMN IF NOT EXISTS postal_code TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS city TEXT DEFAULT '';

COMMENT ON COLUMN invoice_recipients.address IS 'Street address (gatuadress).';
COMMENT ON COLUMN invoice_recipients.postal_code IS 'Postnummer.';
COMMENT ON COLUMN invoice_recipients.city IS 'Stad / postort.';
