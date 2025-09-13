-- Migration script to calculate and update sb_price for existing wines
-- This script calculates the Systembolaget price for all existing wines

-- First, let's see what wines we have and their current prices
SELECT 
  id,
  wine_name,
  price,
  volume_liters,
  supplier_price
FROM wines 
WHERE supplier_price IS NOT NULL 
ORDER BY wine_name;

-- Update sb_price for wines that have supplier_price
-- Using the calculation: supplier_price + 14.7% markup + 5.40 SEK wine markup + alcohol tax + 25% VAT
UPDATE wines 
SET sb_price = ROUND(
  (
    (supplier_price + (supplier_price * 0.147) + 5.40) + 
    (COALESCE(volume_liters, 0.75) * 29.58)
  ) * 1.25, 
  2
)
WHERE supplier_price IS NOT NULL;

-- Show the updated results
SELECT 
  id,
  wine_name,
  price as our_price,
  supplier_price,
  sb_price,
  ROUND(((sb_price - price) / price) * 100, 1) as price_difference_percent
FROM wines 
WHERE sb_price IS NOT NULL
ORDER BY wine_name;
