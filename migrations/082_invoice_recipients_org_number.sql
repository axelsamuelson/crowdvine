-- Migration 082: Add org_number to invoice_recipients (Swedish org number, e.g. for ABPI lookup)
ALTER TABLE invoice_recipients
  ADD COLUMN IF NOT EXISTS org_number TEXT DEFAULT '';

COMMENT ON COLUMN invoice_recipients.org_number IS 'Swedish organisationsnummer (e.g. 556074-7551). Used for ABPI lookup and display.';
