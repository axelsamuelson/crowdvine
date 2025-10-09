-- Migration to update existing bookings with correct pallet_id
-- Kör denna SQL i Supabase Dashboard -> SQL Editor

-- Uppdatera befintliga bookings med pallet_id baserat på zones
-- Vi använder pallet "Pallet Beziers to Stockholm" för alla bookings som inte har pallet_id

UPDATE bookings 
SET pallet_id = 'e52de098-3d0f-4e5f-a363-b856da907183'
WHERE pallet_id IS NULL;

-- Verifiera att uppdateringen fungerade
SELECT 
  COUNT(*) as total_bookings,
  COUNT(pallet_id) as bookings_with_pallet,
  SUM(quantity) as total_bottles
FROM bookings;
