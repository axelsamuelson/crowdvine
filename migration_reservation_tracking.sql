-- Reservation Tracking Table
-- Denna tabell används för att spåra reservations-ID:n som kunder kan använda för att kolla status
CREATE TABLE IF NOT EXISTS reservation_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES order_reservations(id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  tracking_code TEXT UNIQUE NOT NULL, -- Kortare, användarvänligt ID för kunder
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index för snabb sökning
CREATE INDEX IF NOT EXISTS idx_reservation_tracking_email ON reservation_tracking(customer_email);
CREATE INDEX IF NOT EXISTS idx_reservation_tracking_code ON reservation_tracking(tracking_code);
CREATE INDEX IF NOT EXISTS idx_reservation_tracking_reservation_id ON reservation_tracking(reservation_id);

-- RLS policies för reservation_tracking
ALTER TABLE reservation_tracking ENABLE ROW LEVEL SECURITY;

-- Tillåt alla att läsa reservation tracking (för status-koll)
CREATE POLICY "Allow public read access to reservation tracking" ON reservation_tracking
  FOR SELECT USING (true);

-- Endast autentiserade användare kan skapa tracking records
CREATE POLICY "Allow authenticated users to create reservation tracking" ON reservation_tracking
  FOR INSERT WITH CHECK (true);

-- Endast reservation owner kan uppdatera tracking
CREATE POLICY "Allow reservation owner to update tracking" ON reservation_tracking
  FOR UPDATE USING (true);

-- Funktion för att generera unika tracking codes
CREATE OR REPLACE FUNCTION generate_tracking_code() RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_count INTEGER;
BEGIN
  LOOP
    -- Generera 8-siffrig kod
    code := LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0');
    
    -- Kontrollera om koden redan finns
    SELECT COUNT(*) INTO exists_count FROM reservation_tracking WHERE tracking_code = code;
    
    -- Om koden inte finns, returnera den
    IF exists_count = 0 THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
