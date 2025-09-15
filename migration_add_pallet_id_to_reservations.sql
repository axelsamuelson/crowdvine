-- Add pallet_id column to order_reservations table
ALTER TABLE order_reservations ADD COLUMN pallet_id UUID REFERENCES pallets(id);

-- Add index for better performance
CREATE INDEX idx_order_reservations_pallet_id ON order_reservations(pallet_id);

-- Update existing reservations with correct pallet based on zones
UPDATE order_reservations 
SET pallet_id = (
  SELECT p.id 
  FROM pallets p 
  WHERE p.pickup_zone_id = order_reservations.pickup_zone_id 
    AND p.delivery_zone_id = order_reservations.delivery_zone_id
  LIMIT 1
)
WHERE pickup_zone_id IS NOT NULL 
  AND delivery_zone_id IS NOT NULL 
  AND pallet_id IS NULL;

-- Add comment
COMMENT ON COLUMN order_reservations.pallet_id IS 'Pallet assigned to this reservation based on pickup and delivery zones';
