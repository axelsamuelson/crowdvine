-- Migration 084: Default sender/company details for invoicing (single row)
-- Used to prefill "From" and company fields when creating a new invoice.
CREATE TABLE invoice_sender_defaults (
  id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  company_name TEXT NOT NULL DEFAULT '',
  company_logo TEXT NOT NULL DEFAULT '',
  company_details TEXT NOT NULL DEFAULT '',
  from_name TEXT NOT NULL DEFAULT '',
  from_email TEXT NOT NULL DEFAULT '',
  from_address TEXT NOT NULL DEFAULT '',
  default_footer TEXT NOT NULL DEFAULT ''
);

COMMENT ON TABLE invoice_sender_defaults IS 'Single row: default company/sender details for new invoices.';

ALTER TABLE invoice_sender_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to invoice_sender_defaults"
  ON invoice_sender_defaults
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

-- Ensure the single row exists
INSERT INTO invoice_sender_defaults (id) VALUES ('00000000-0000-0000-0000-000000000001'::uuid)
ON CONFLICT (id) DO NOTHING;
