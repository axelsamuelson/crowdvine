-- Simple script to calculate sb_price using existing cost_amount
-- Run this after the main migration to calculate Systembolaget prices

-- Show wines with cost_amount before calculation
SELECT 
  id,
  wine_name,
  ROUND(base_price_cents / 100, 2) as our_price_sek,
  cost_amount,
  exchange_rate,
  alcohol_tax_cents,
  sb_price
FROM wines 
WHERE cost_amount IS NOT NULL AND cost_amount > 0
ORDER BY wine_name;

-- Calculate sb_price for all wines with cost_amount
-- Using the same formula as our prices but with 14.7% margin instead of our margin
UPDATE wines 
SET sb_price = ROUND(
  (
    (cost_amount * COALESCE(exchange_rate, 1.0) * (1 + 0.147)) + 
    (COALESCE(alcohol_tax_cents, 0) / 100.0)
  ) * 1.25, 
  2
)
WHERE cost_amount IS NOT NULL AND cost_amount > 0;

-- Show results with price comparison
SELECT 
  id,
  wine_name,
  ROUND(base_price_cents / 100, 2) as our_price_sek,
  cost_amount,
  exchange_rate,
  alcohol_tax_cents,
  sb_price,
  CASE 
    WHEN sb_price IS NOT NULL THEN 
      ROUND(((sb_price - (base_price_cents / 100)) / (base_price_cents / 100)) * 100, 1)
    ELSE NULL 
  END as price_difference_percent,
  CASE 
    WHEN sb_price IS NOT NULL AND sb_price > (base_price_cents / 100) THEN 'Systembolaget högre'
    WHEN sb_price IS NOT NULL AND sb_price < (base_price_cents / 100) THEN 'Vi högre'
    WHEN sb_price IS NOT NULL THEN 'Samma pris'
    ELSE 'Ingen jämförelse'
  END as price_comparison
FROM wines 
WHERE cost_amount IS NOT NULL AND cost_amount > 0
ORDER BY wine_name;
