-- Punktskattenummer on the invoice sender, included in the snapshot at issue.
-- The invoice year, invoice date and due date use the Stockholm calendar date.

ALTER TABLE invoice_sender_defaults
  ADD COLUMN IF NOT EXISTS excise_number text;

COMMENT ON COLUMN invoice_sender_defaults.excise_number IS
  'Punktskattenummer för alkohol.';

UPDATE invoice_sender_defaults
SET
  excise_number = 'SEM9404025133',
  company_details = CASE
    WHEN company_details = 'Punktskattenummer: SEM9404025133' THEN ''
    ELSE company_details
  END,
  updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;

CREATE OR REPLACE FUNCTION issue_invoice(p_invoice_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := coalesce(auth.role(), auth.jwt() ->> 'role', '');
  v_inv invoices%ROWTYPE;
  v_today date;
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

  v_today := (now() AT TIME ZONE 'Europe/Stockholm')::date;
  v_year := EXTRACT(YEAR FROM v_today)::int;

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
    invoice_date = v_today,
    due_date = v_today + v_inv.payment_terms_days,
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
      'excise_number', COALESCE(v_sender.excise_number, ''),
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
  'Assigns the next YYYY-NNN number from the Stockholm date and freezes recipient and sender snapshots, including excise_number.';

REVOKE ALL ON FUNCTION issue_invoice(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION issue_invoice(uuid) TO service_role, authenticated;
