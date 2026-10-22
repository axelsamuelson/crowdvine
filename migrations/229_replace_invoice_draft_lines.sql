-- Replace every line on a draft invoice in one transaction, then recompute totals.

CREATE OR REPLACE FUNCTION replace_invoice_draft_lines(p_invoice_id uuid, p_lines jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := coalesce(auth.role(), auth.jwt() ->> 'role', '');
  v_status text;
  v_number text;
  v_line jsonb;
  v_index int := 0;
  v_qty numeric;
  v_unit bigint;
  v_rate numeric;
  v_total bigint;
  v_wine uuid;
  v_description text;
  v_vintage text;
  v_subtotal bigint;
  v_vat bigint;
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

  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) < 1 THEN
    RAISE EXCEPTION 'Fakturan behöver minst en rad';
  END IF;

  SELECT status, invoice_number INTO v_status, v_number
  FROM invoices
  WHERE id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fakturan hittades inte';
  END IF;
  IF v_status <> 'draft' THEN
    RAISE EXCEPTION 'Faktura % är % och kan inte ändras',
      COALESCE(v_number, p_invoice_id::text),
      invoice_status_sv(v_status);
  END IF;

  DELETE FROM invoice_lines WHERE invoice_id = p_invoice_id;

  FOR v_line IN SELECT value FROM jsonb_array_elements(p_lines)
  LOOP
    v_index := v_index + 1;
    IF jsonb_typeof(v_line) <> 'object' THEN
      RAISE EXCEPTION 'Fakturarad % är ogiltig', v_index;
    END IF;

    v_description := btrim(COALESCE(v_line->>'description', ''));
    IF v_description = '' THEN
      RAISE EXCEPTION 'Fakturarad % saknar beskrivning', v_index;
    END IF;

    BEGIN
      v_qty := (v_line->>'quantity')::numeric;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Fakturarad % har ogiltigt antal', v_index;
    END;
    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Fakturarad % har ogiltigt antal', v_index;
    END IF;

    BEGIN
      v_unit := (v_line->>'unit_price_ore')::bigint;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Fakturarad % saknar à-pris', v_index;
    END;
    IF v_unit IS NULL OR v_unit < 0 THEN
      RAISE EXCEPTION 'Fakturarad % saknar à-pris', v_index;
    END IF;

    BEGIN
      v_rate := COALESCE((v_line->>'vat_rate')::numeric, 25);
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Fakturarad % har ogiltig momssats', v_index;
    END;
    IF v_rate < 0 OR v_rate > 100 THEN
      RAISE EXCEPTION 'Fakturarad % har ogiltig momssats', v_index;
    END IF;

    BEGIN
      v_wine := NULLIF(btrim(COALESCE(v_line->>'wine_id', '')), '')::uuid;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Fakturarad % har ogiltigt vin-id', v_index;
    END;

    v_vintage := NULLIF(btrim(COALESCE(v_line->>'vintage', '')), '');
    v_total := ROUND(v_qty * v_unit)::bigint;

    INSERT INTO invoice_lines (
      invoice_id,
      position,
      wine_id,
      description,
      vintage,
      quantity,
      unit_price_ore,
      vat_rate,
      line_total_ore
    ) VALUES (
      p_invoice_id,
      v_index,
      v_wine,
      v_description,
      v_vintage,
      v_qty,
      v_unit,
      v_rate,
      v_total
    );
  END LOOP;

  SELECT
    COALESCE(SUM(line_total_ore), 0)::bigint,
    COALESCE(SUM(ROUND(line_total_ore::numeric * vat_rate / 100)), 0)::bigint
  INTO v_subtotal, v_vat
  FROM invoice_lines
  WHERE invoice_id = p_invoice_id;

  UPDATE invoices
  SET
    subtotal_ore = v_subtotal,
    vat_ore = v_vat,
    total_ore = v_subtotal + v_vat,
    updated_at = now()
  WHERE id = p_invoice_id;

  RETURN (SELECT to_jsonb(i) FROM invoices i WHERE i.id = p_invoice_id);
END;
$$;

COMMENT ON FUNCTION replace_invoice_draft_lines(uuid, jsonb) IS
  'Replaces draft invoice lines and recomputes öre totals in one transaction.';

REVOKE ALL ON FUNCTION replace_invoice_draft_lines(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION replace_invoice_draft_lines(uuid, jsonb) TO service_role, authenticated;
