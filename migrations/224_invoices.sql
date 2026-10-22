-- Saved invoices. Numbers are assigned only when a human issues the invoice,
-- so discarded drafts do not leave gaps. An issued number is never reused;
-- a wrong invoice is voided instead of deleted.

CREATE TABLE IF NOT EXISTS invoice_number_counters (
  year int PRIMARY KEY,
  last_number int NOT NULL
);

INSERT INTO invoice_number_counters (year, last_number)
VALUES (2025, 1)
ON CONFLICT (year) DO NOTHING;

COMMENT ON TABLE invoice_number_counters IS
  'Per-year sequence for issued invoices. 2025 starts at 1 because 2025-001 was issued to Bistro Mirabelle outside the system.';

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'paid', 'void')),
  recipient_id uuid NOT NULL REFERENCES invoice_recipients(id),
  recipient_snapshot jsonb,
  sender_snapshot jsonb,
  ship_to jsonb,
  invoice_date date,
  delivery_date date,
  payment_terms_days int NOT NULL DEFAULT 30,
  due_date date,
  currency text NOT NULL DEFAULT 'SEK',
  subtotal_ore bigint,
  vat_ore bigint,
  total_ore bigint,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_via text NOT NULL DEFAULT 'admin' CHECK (created_via IN ('admin', 'mcp')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  issued_at timestamptz
);

COMMENT ON TABLE invoices IS
  'B2B invoices. invoice_number is NULL while status is draft and is set by issue_invoice.';
COMMENT ON COLUMN invoices.recipient_snapshot IS
  'Bill-to snapshot taken at issue: company, org number, address, invoice email, primary contact.';
COMMENT ON COLUMN invoices.sender_snapshot IS
  'Sender snapshot taken at issue from invoice_sender_defaults.';
COMMENT ON COLUMN invoices.subtotal_ore IS 'Sum of line totals excl. VAT, in öre.';

CREATE INDEX IF NOT EXISTS idx_invoices_recipient_id ON invoices(recipient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date);

CREATE TABLE IF NOT EXISTS invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  position int NOT NULL,
  wine_id uuid REFERENCES wines(id) ON DELETE SET NULL,
  description text NOT NULL,
  vintage text,
  quantity numeric NOT NULL CHECK (quantity > 0),
  unit_price_ore bigint NOT NULL,
  vat_rate numeric NOT NULL DEFAULT 25,
  line_total_ore bigint NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice_id ON invoice_lines(invoice_id, position);

COMMENT ON COLUMN invoice_lines.unit_price_ore IS 'Unit price excl. VAT, in öre.';
COMMENT ON COLUMN invoice_lines.line_total_ore IS 'quantity * unit_price_ore, rounded to öre.';

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_number_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access to invoices" ON invoices;
CREATE POLICY "Admin full access to invoices"
  ON invoices
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

DROP POLICY IF EXISTS "Admin full access to invoice_lines" ON invoice_lines;
CREATE POLICY "Admin full access to invoice_lines"
  ON invoice_lines
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

DROP POLICY IF EXISTS "Admin full access to invoice_number_counters" ON invoice_number_counters;
CREATE POLICY "Admin full access to invoice_number_counters"
  ON invoice_number_counters
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

CREATE OR REPLACE FUNCTION invoice_status_sv(p_status text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_status
    WHEN 'draft' THEN 'utkast'
    WHEN 'issued' THEN 'utfärdad'
    WHEN 'paid' THEN 'betald'
    WHEN 'void' THEN 'makulerad'
    ELSE p_status
  END;
$$;

CREATE OR REPLACE FUNCTION invoices_guard_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_label text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'draft' THEN
      v_label := COALESCE(OLD.invoice_number, OLD.id::text);
      RAISE EXCEPTION 'Faktura % är % och kan inte raderas', v_label, invoice_status_sv(OLD.status);
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.status <> 'draft' THEN
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status NOT IN ('paid', 'void') THEN
      v_label := COALESCE(OLD.invoice_number, OLD.id::text);
      RAISE EXCEPTION 'Faktura % kan inte få status %', v_label, invoice_status_sv(NEW.status);
    END IF;
    IF (to_jsonb(NEW) - 'status') IS DISTINCT FROM (to_jsonb(OLD) - 'status') THEN
      v_label := COALESCE(OLD.invoice_number, OLD.id::text);
      RAISE EXCEPTION 'Faktura % är % och kan inte ändras', v_label, invoice_status_sv(OLD.status);
    END IF;
    NEW.updated_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS invoices_guard_mutation ON invoices;
CREATE TRIGGER invoices_guard_mutation
  BEFORE UPDATE OR DELETE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION invoices_guard_mutation();

CREATE OR REPLACE FUNCTION invoice_lines_guard_issued()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_invoice_id uuid;
  v_status text;
  v_number text;
BEGIN
  v_invoice_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.invoice_id ELSE NEW.invoice_id END;
  SELECT status, invoice_number INTO v_status, v_number
  FROM invoices
  WHERE id = v_invoice_id;

  IF v_status IS NOT NULL AND v_status <> 'draft' THEN
    RAISE EXCEPTION 'Faktura % är % och kan inte ändras',
      COALESCE(v_number, v_invoice_id::text),
      invoice_status_sv(v_status);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS invoice_lines_guard_issued ON invoice_lines;
CREATE TRIGGER invoice_lines_guard_issued
  BEFORE INSERT OR UPDATE OR DELETE ON invoice_lines
  FOR EACH ROW
  EXECUTE FUNCTION invoice_lines_guard_issued();

CREATE OR REPLACE FUNCTION issue_invoice(p_invoice_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := coalesce(auth.role(), auth.jwt() ->> 'role', '');
  v_inv invoices%ROWTYPE;
  v_year int;
  v_n int;
  v_line_count int;
  v_subtotal bigint;
  v_vat bigint;
  v_recipient invoice_recipients%ROWTYPE;
  v_contact invoice_recipient_contacts%ROWTYPE;
  v_sender invoice_sender_defaults%ROWTYPE;
  v_has_contact boolean := false;
  v_has_sender boolean := false;
BEGIN
  IF v_role IS DISTINCT FROM 'service_role' THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR (profiles.roles IS NOT NULL AND 'admin' = ANY(profiles.roles)))
    ) THEN
      RAISE EXCEPTION 'Admin access required';
    END IF;
  END IF;

  SELECT * INTO v_inv FROM invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fakturan hittades inte';
  END IF;
  IF v_inv.status <> 'draft' THEN
    RAISE EXCEPTION 'Faktura % är % och kan inte ändras',
      COALESCE(v_inv.invoice_number, v_inv.id::text),
      invoice_status_sv(v_inv.status);
  END IF;

  SELECT COUNT(*)::int INTO v_line_count FROM invoice_lines WHERE invoice_id = p_invoice_id;
  IF v_line_count < 1 THEN
    RAISE EXCEPTION 'Fakturan saknar rader och kan inte utfärdas';
  END IF;

  UPDATE invoice_lines
  SET line_total_ore = ROUND(quantity * unit_price_ore)::bigint
  WHERE invoice_id = p_invoice_id;

  SELECT
    COALESCE(SUM(line_total_ore), 0)::bigint,
    COALESCE(SUM(ROUND(line_total_ore::numeric * vat_rate / 100)), 0)::bigint
  INTO v_subtotal, v_vat
  FROM invoice_lines
  WHERE invoice_id = p_invoice_id;

  SELECT * INTO v_recipient FROM invoice_recipients WHERE id = v_inv.recipient_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fakturamottagaren hittades inte';
  END IF;

  SELECT * INTO v_contact
  FROM invoice_recipient_contacts
  WHERE recipient_id = v_inv.recipient_id AND is_primary = true
  LIMIT 1;
  v_has_contact := FOUND;

  SELECT * INTO v_sender
  FROM invoice_sender_defaults
  WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;
  v_has_sender := FOUND;
  IF NOT v_has_sender THEN
    RAISE EXCEPTION 'Avsändaruppgifter saknas';
  END IF;

  v_year := EXTRACT(YEAR FROM current_date)::int;

  INSERT INTO invoice_number_counters (year, last_number)
  VALUES (v_year, 0)
  ON CONFLICT (year) DO NOTHING;

  SELECT last_number INTO v_n
  FROM invoice_number_counters
  WHERE year = v_year
  FOR UPDATE;

  v_n := v_n + 1;

  UPDATE invoice_number_counters
  SET last_number = v_n
  WHERE year = v_year;

  UPDATE invoices
  SET
    invoice_number = v_year::text || '-' || lpad(v_n::text, 3, '0'),
    status = 'issued',
    invoice_date = current_date,
    due_date = current_date + v_inv.payment_terms_days,
    issued_at = now(),
    updated_at = now(),
    subtotal_ore = v_subtotal,
    vat_ore = v_vat,
    total_ore = v_subtotal + v_vat,
    recipient_snapshot = jsonb_build_object(
      'company_name', COALESCE(v_recipient.company_name, ''),
      'org_number', COALESCE(v_recipient.org_number, ''),
      'address', COALESCE(v_recipient.address, ''),
      'postal_code', COALESCE(v_recipient.postal_code, ''),
      'city', COALESCE(v_recipient.city, ''),
      'email', COALESCE(v_recipient.email, ''),
      'primary_contact', CASE
        WHEN v_has_contact THEN jsonb_build_object(
          'name', v_contact.name,
          'email', v_contact.email,
          'phone', v_contact.phone,
          'title', v_contact.title
        )
        ELSE NULL
      END
    ),
    sender_snapshot = jsonb_build_object(
      'company_name', COALESCE(v_sender.company_name, ''),
      'company_logo', COALESCE(v_sender.company_logo, ''),
      'company_details', COALESCE(v_sender.company_details, ''),
      'org_number', COALESCE(v_sender.org_number, ''),
      'vat_number', COALESCE(v_sender.vat_number, ''),
      'from_name', COALESCE(v_sender.from_name, ''),
      'from_email', COALESCE(v_sender.from_email, ''),
      'from_address', COALESCE(v_sender.from_address, ''),
      'from_postal_code', COALESCE(v_sender.from_postal_code, ''),
      'from_city', COALESCE(v_sender.from_city, ''),
      'from_country', COALESCE(v_sender.from_country, ''),
      'clearing_number', COALESCE(v_sender.clearing_number, ''),
      'account_number', COALESCE(v_sender.account_number, ''),
      'payment_terms', COALESCE(v_sender.payment_terms, ''),
      'default_footer', COALESCE(v_sender.default_footer, '')
    )
  WHERE id = p_invoice_id
  RETURNING * INTO v_inv;

  RETURN to_jsonb(v_inv);
END;
$$;

COMMENT ON FUNCTION issue_invoice(uuid) IS
  'Assigns the next YYYY-NNN number and freezes recipient and sender snapshots. Not exposed via MCP.';

REVOKE ALL ON FUNCTION issue_invoice(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION issue_invoice(uuid) TO service_role, authenticated;
