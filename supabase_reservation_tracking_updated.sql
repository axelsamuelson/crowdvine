-- Kör denna SQL i Supabase Dashboard -> SQL Editor
-- Reservation Tracking Table (Uppdaterad version som hanterar befintliga objekt)

-- Skapa tabellen om den inte finns
CREATE TABLE IF NOT EXISTS reservation_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES order_reservations(id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  tracking_code TEXT UNIQUE NOT NULL, -- Kortare, användarvänligt ID för kunder
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index för snabb sökning (skapa endast om de inte finns)
CREATE INDEX IF NOT EXISTS idx_reservation_tracking_email ON reservation_tracking(customer_email);
CREATE INDEX IF NOT EXISTS idx_reservation_tracking_code ON reservation_tracking(tracking_code);
CREATE INDEX IF NOT EXISTS idx_reservation_tracking_reservation_id ON reservation_tracking(reservation_id);

-- RLS policies för reservation_tracking
ALTER TABLE reservation_tracking ENABLE ROW LEVEL SECURITY;

-- Ta bort befintliga policies om de finns och skapa nya
DROP POLICY IF EXISTS "Allow public read access to reservation tracking" ON reservation_tracking;
DROP POLICY IF EXISTS "Allow authenticated users to create reservation tracking" ON reservation_tracking;
DROP POLICY IF EXISTS "Allow reservation owner to update tracking" ON reservation_tracking;

-- Skapa nya policies
CREATE POLICY "Allow public read access to reservation tracking" ON reservation_tracking
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to create reservation tracking" ON reservation_tracking
  FOR INSERT WITH CHECK (true);

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
