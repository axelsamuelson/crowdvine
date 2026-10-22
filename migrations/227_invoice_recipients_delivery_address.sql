-- Record of the delivery-address columns on invoice_recipients, added directly in Supabase.
-- Idempotent: a second run against production does not change existing columns.

ALTER TABLE invoice_recipients
  ADD COLUMN IF NOT EXISTS delivery_name text,
  ADD COLUMN IF NOT EXISTS delivery_address text,
  ADD COLUMN IF NOT EXISTS delivery_postal_code text,
  ADD COLUMN IF NOT EXISTS delivery_city text;

COMMENT ON COLUMN invoice_recipients.delivery_name IS
  'Leveransadress: mottagarnamn, t.ex. restaurangens namn. NULL = samma som fakturaadress.';
COMMENT ON COLUMN invoice_recipients.delivery_address IS
  'Leveransadress: gata.';
COMMENT ON COLUMN invoice_recipients.delivery_postal_code IS
  'Leveransadress: postnummer.';
COMMENT ON COLUMN invoice_recipients.delivery_city IS
  'Leveransadress: ort.';
