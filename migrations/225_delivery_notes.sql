-- Delivery notes (leveranssedlar) sent with goods to a restaurant or bar.
-- Numbers are LS-YYYY-NNN and are separate from invoice numbers.

CREATE TABLE IF NOT EXISTS delivery_note_counters (
  year int PRIMARY KEY,
  last_number int NOT NULL
);

CREATE TABLE IF NOT EXISTS delivery_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_number text NOT NULL UNIQUE,
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  recipient_id uuid NOT NULL REFERENCES invoice_recipients(id),
  recipient_snapshot jsonb NOT NULL,
  sender_snapshot jsonb NOT NULL,
  ship_to jsonb,
  delivery_date date NOT NULL,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_via text NOT NULL DEFAULT 'admin' CHECK (created_via IN ('admin', 'mcp')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE delivery_notes IS
  'Delivery note handed to a restaurant or bar. Prices stay on the invoice.';

CREATE INDEX IF NOT EXISTS idx_delivery_notes_recipient_id ON delivery_notes(recipient_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_invoice_id ON delivery_notes(invoice_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_delivery_date ON delivery_notes(delivery_date);

CREATE TABLE IF NOT EXISTS delivery_note_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_note_id uuid NOT NULL REFERENCES delivery_notes(id) ON DELETE CASCADE,
  position int NOT NULL,
  wine_id uuid REFERENCES wines(id) ON DELETE SET NULL,
  description text NOT NULL,
  vintage text,
  quantity numeric NOT NULL CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_delivery_note_lines_note_id
  ON delivery_note_lines(delivery_note_id, position);

ALTER TABLE delivery_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_note_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_note_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access to delivery_notes" ON delivery_notes;
CREATE POLICY "Admin full access to delivery_notes"
  ON delivery_notes
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

DROP POLICY IF EXISTS "Admin full access to delivery_note_lines" ON delivery_note_lines;
CREATE POLICY "Admin full access to delivery_note_lines"
  ON delivery_note_lines
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

DROP POLICY IF EXISTS "Admin full access to delivery_note_counters" ON delivery_note_counters;
CREATE POLICY "Admin full access to delivery_note_counters"
  ON delivery_note_counters
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

CREATE OR REPLACE FUNCTION next_delivery_note_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year int := EXTRACT(YEAR FROM (current_timestamp AT TIME ZONE 'Europe/Stockholm'))::int;
  v_n int;
BEGIN
  INSERT INTO delivery_note_counters (year, last_number)
  VALUES (v_year, 0)
  ON CONFLICT (year) DO NOTHING;

  SELECT last_number INTO v_n
  FROM delivery_note_counters
  WHERE year = v_year
  FOR UPDATE;

  v_n := v_n + 1;

  UPDATE delivery_note_counters
  SET last_number = v_n
  WHERE year = v_year;

  RETURN 'LS-' || v_year::text || '-' || lpad(v_n::text, 3, '0');
END;
$$;

COMMENT ON FUNCTION next_delivery_note_number() IS
  'Next delivery-note number LS-YYYY-NNN. Separate from invoice numbers.';

REVOKE ALL ON FUNCTION next_delivery_note_number() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION next_delivery_note_number() TO service_role;
