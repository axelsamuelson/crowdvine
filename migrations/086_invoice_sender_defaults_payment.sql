-- Migration 086: Default payment info for invoices (clearing number, account number, payment terms)
ALTER TABLE invoice_sender_defaults
  ADD COLUMN IF NOT EXISTS clearing_number TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS account_number TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_terms TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN invoice_sender_defaults.clearing_number IS 'Clearing number (bankgiro etc.) for payment info on invoice.';
COMMENT ON COLUMN invoice_sender_defaults.account_number IS 'Account number for payment info on invoice.';
COMMENT ON COLUMN invoice_sender_defaults.payment_terms IS 'Default payment terms text (e.g. "Net 30").';
