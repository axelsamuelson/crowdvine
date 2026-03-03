-- Migration 081: Invoice recipients (company profiles for invoicing)
-- Stores company/contact details so invoices can be created by selecting a recipient.
-- Optional profile_id links to an existing business user (profiles).

CREATE TABLE invoice_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL DEFAULT '',
  contact_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT ''
);

COMMENT ON TABLE invoice_recipients IS 'Companies/customers that can be selected as invoice recipients. Optional link to profiles (business users).';
COMMENT ON COLUMN invoice_recipients.profile_id IS 'If set, this recipient is linked to a business user (profile).';
COMMENT ON COLUMN invoice_recipients.company_name IS 'Company name (invoice header / "To").';
COMMENT ON COLUMN invoice_recipients.contact_name IS 'Contact person name (toName).';
COMMENT ON COLUMN invoice_recipients.email IS 'Invoice recipient email (toEmail).';
COMMENT ON COLUMN invoice_recipients.address IS 'Invoice recipient address (toAddress).';

CREATE INDEX idx_invoice_recipients_profile_id ON invoice_recipients(profile_id) WHERE profile_id IS NOT NULL;
CREATE INDEX idx_invoice_recipients_company_name ON invoice_recipients(company_name);

ALTER TABLE invoice_recipients ENABLE ROW LEVEL SECURITY;

-- Admin-only access (same pattern as other admin tables)
CREATE POLICY "Admin full access to invoice_recipients"
  ON invoice_recipients
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR (profiles.roles IS NOT NULL AND 'admin' = ANY(profiles.roles)))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR (profiles.roles IS NOT NULL AND 'admin' = ANY(profiles.roles)))
    )
  );
