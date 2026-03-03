-- Migration 085: Split company details and address into one field per value
-- Företagsuppgifter: org_number, vat_number
-- Adress (From): from_address = street only; add from_postal_code, from_city, from_country

ALTER TABLE invoice_sender_defaults
  ADD COLUMN IF NOT EXISTS org_number TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS vat_number TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS from_postal_code TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS from_city TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS from_country TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN invoice_sender_defaults.org_number IS 'Organisationsnummer (företagsuppgifter).';
COMMENT ON COLUMN invoice_sender_defaults.vat_number IS 'Momsreg.nr (företagsuppgifter).';
COMMENT ON COLUMN invoice_sender_defaults.from_address IS 'Gatuadress (From).';
COMMENT ON COLUMN invoice_sender_defaults.from_postal_code IS 'Postnummer (From).';
COMMENT ON COLUMN invoice_sender_defaults.from_city IS 'Ort/Stad (From).';
COMMENT ON COLUMN invoice_sender_defaults.from_country IS 'Land (From).';
