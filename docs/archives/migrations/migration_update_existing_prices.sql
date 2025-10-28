-- Update existing wines with calculated prices and round up
-- Kör denna SQL i Supabase Dashboard -> SQL Editor

-- Update all wines with calculated prices
UPDATE wines 
SET 
  calculated_price_cents = CASE 
    WHEN cost_amount > 0 THEN 
      CEIL(
        (cost_amount * COALESCE(exchange_rate, 1.0) * (1 + COALESCE(margin_percentage, 30) / 100) + 
         COALESCE(alcohol_tax_cents, 0) / 100.0) * 
        CASE WHEN COALESCE(price_includes_vat, true) THEN 1 ELSE 1.25 END * 100
      )
    ELSE base_price_cents
  END,
  base_price_cents = CASE 
    WHEN cost_amount > 0 THEN 
      CEIL(
        (cost_amount * COALESCE(exchange_rate, 1.0) * (1 + COALESCE(margin_percentage, 30) / 100) + 
         COALESCE(alcohol_tax_cents, 0) / 100.0) * 
        CASE WHEN COALESCE(price_includes_vat, true) THEN 1 ELSE 1.25 END * 100
      )
    ELSE base_price_cents
  END
WHERE cost_amount > 0;

-- Show the updated prices
SELECT 
  wine_name,
  cost_amount,
  exchange_rate,
  margin_percentage,
  alcohol_tax_cents,
  price_includes_vat,
  base_price_cents,
  calculated_price_cents,
  ROUND(base_price_cents / 100.0, 2) as price_sek
FROM wines 
ORDER BY wine_name;
