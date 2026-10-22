-- Record of invoice_recipient_contacts, created directly in Supabase.
-- Idempotent: a second run against production does not change the live table.

CREATE TABLE IF NOT EXISTS invoice_recipient_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES invoice_recipients(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  title text,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE invoice_recipient_contacts IS
  'Kontaktpersoner per fakturamottagare. En mottagare kan ha flera; högst en is_primary.';

CREATE INDEX IF NOT EXISTS idx_invoice_recipient_contacts_recipient
  ON invoice_recipient_contacts (recipient_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_invoice_recipient_contacts_one_primary
  ON invoice_recipient_contacts (recipient_id)
  WHERE is_primary;

ALTER TABLE invoice_recipient_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access to invoice_recipient_contacts" ON invoice_recipient_contacts;
CREATE POLICY "Admin full access to invoice_recipient_contacts"
  ON invoice_recipient_contacts
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
