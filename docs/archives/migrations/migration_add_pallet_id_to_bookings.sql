-- Add pallet_id column to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pallet_id UUID REFERENCES pallets(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_pallet_id ON bookings(pallet_id);

-- Update RLS policies to include pallet_id
DROP POLICY IF EXISTS "Allow authenticated users to read their own bookings" ON bookings;
CREATE POLICY "Allow authenticated users to read their own bookings" ON bookings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow authenticated users to insert their own bookings" ON bookings;
CREATE POLICY "Allow authenticated users to insert their own bookings" ON bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow public read access to bookings" ON bookings;
CREATE POLICY "Allow public read access to bookings" ON bookings
  FOR SELECT USING (true);
