-- Add pallet_id column to order_reservations table
-- This makes the relationship between reservations and pallets explicit and simple

-- Step 1: Add the column (nullable initially)
ALTER TABLE order_reservations 
ADD COLUMN IF NOT EXISTS pallet_id UUID;

-- Step 2: Add foreign key constraint
ALTER TABLE order_reservations
ADD CONSTRAINT fk_order_reservations_pallet
FOREIGN KEY (pallet_id) 
REFERENCES pallets(id)
ON DELETE SET NULL;

-- Step 3: Create index for performance
CREATE INDEX IF NOT EXISTS idx_order_reservations_pallet_id 
ON order_reservations(pallet_id);

-- Step 4: Backfill existing data based on zone matching
UPDATE order_reservations
SET pallet_id = (
  SELECT p.id
  FROM pallets p
  WHERE p.pickup_zone_id = order_reservations.pickup_zone_id
    AND p.delivery_zone_id = order_reservations.delivery_zone_id
  LIMIT 1
)
WHERE pallet_id IS NULL;

-- Verify the update
SELECT 
  COUNT(*) as total_reservations,
  COUNT(pallet_id) as with_pallet_id,
  COUNT(*) - COUNT(pallet_id) as without_pallet_id
FROM order_reservations;

