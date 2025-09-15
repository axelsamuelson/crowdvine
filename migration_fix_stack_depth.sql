-- Fix stack depth limit exceeded by removing trigger and updating function
-- Kör denna SQL i Supabase Dashboard -> SQL Editor

-- Remove the trigger that causes the infinite loop
DROP TRIGGER IF EXISTS calculate_wine_price_trigger ON wines;

-- Update the function to not update the table (avoid recursion)
CREATE OR REPLACE FUNCTION calculate_wine_price(wine_id UUID)
RETURNS INTEGER AS $$
DECLARE
  wine_record RECORD;
  exchange_rate DECIMAL(10,6);
  cost_in_sek DECIMAL(10,2);
  price_before_tax DECIMAL(10,2);
  price_after_tax DECIMAL(10,2);
  final_price_cents INTEGER;
BEGIN
  -- Get wine data
  SELECT * INTO wine_record FROM wines WHERE id = wine_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Use the exchange_rate directly from wines table
  exchange_rate := wine_record.exchange_rate;
  
  -- If no exchange rate found, use default
  IF exchange_rate IS NULL THEN
    exchange_rate := 1.0;
  END IF;
  
  -- Calculate cost in SEK
  cost_in_sek := wine_record.cost_amount * exchange_rate;
  
  -- Add margin
  price_before_tax := cost_in_sek * (1 + wine_record.margin_percentage / 100);
  
  -- Add alcohol tax
  price_after_tax := price_before_tax + (wine_record.alcohol_tax_cents / 100.0);
  
  -- Handle VAT
  IF wine_record.price_includes_vat THEN
    final_price_cents := ROUND(price_after_tax * 100);
  ELSE
    final_price_cents := ROUND(price_after_tax * 1.25 * 100);
  END IF;
  
  -- Return the calculated price (DON'T UPDATE THE TABLE HERE!)
  RETURN final_price_cents;
END;
$$ LANGUAGE plpgsql;
