-- Create a raw SQL function to update wines without ambiguity
-- Kör denna SQL i Supabase Dashboard -> SQL Editor

CREATE OR REPLACE FUNCTION update_wine_raw(
  wine_id UUID,
  wine_name TEXT DEFAULT NULL,
  vintage TEXT DEFAULT NULL,
  grape_varieties TEXT DEFAULT NULL,
  color TEXT DEFAULT NULL,
  producer_id UUID DEFAULT NULL,
  cost_currency TEXT DEFAULT NULL,
  cost_amount DECIMAL(10,2) DEFAULT NULL,
  exchange_rate_source TEXT DEFAULT NULL,
  exchange_rate_date DATE DEFAULT NULL,
  exchange_rate_period_start DATE DEFAULT NULL,
  exchange_rate_period_end DATE DEFAULT NULL,
  exchange_rate DECIMAL(10,6) DEFAULT NULL,
  alcohol_tax_cents INTEGER DEFAULT NULL,
  price_includes_vat BOOLEAN DEFAULT NULL,
  margin_percentage DECIMAL(5,2) DEFAULT NULL,
  base_price_cents INTEGER DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  update_query TEXT;
  wine_record RECORD;
BEGIN
  -- Build dynamic update query
  update_query := 'UPDATE wines SET updated_at = NOW()';
  
  IF wine_name IS NOT NULL THEN
    update_query := update_query || ', wine_name = $2';
  END IF;
  IF vintage IS NOT NULL THEN
    update_query := update_query || ', vintage = $3';
  END IF;
  IF grape_varieties IS NOT NULL THEN
    update_query := update_query || ', grape_varieties = $4';
  END IF;
  IF color IS NOT NULL THEN
    update_query := update_query || ', color = $5';
  END IF;
  IF producer_id IS NOT NULL THEN
    update_query := update_query || ', producer_id = $6';
  END IF;
  IF cost_currency IS NOT NULL THEN
    update_query := update_query || ', cost_currency = $7';
  END IF;
  IF cost_amount IS NOT NULL THEN
    update_query := update_query || ', cost_amount = $8';
  END IF;
  IF exchange_rate_source IS NOT NULL THEN
    update_query := update_query || ', exchange_rate_source = $9';
  END IF;
  IF exchange_rate_date IS NOT NULL THEN
    update_query := update_query || ', exchange_rate_date = $10';
  END IF;
  IF exchange_rate_period_start IS NOT NULL THEN
    update_query := update_query || ', exchange_rate_period_start = $11';
  END IF;
  IF exchange_rate_period_end IS NOT NULL THEN
    update_query := update_query || ', exchange_rate_period_end = $12';
  END IF;
  IF exchange_rate IS NOT NULL THEN
    update_query := update_query || ', exchange_rate = $13';
  END IF;
  IF alcohol_tax_cents IS NOT NULL THEN
    update_query := update_query || ', alcohol_tax_cents = $14';
  END IF;
  IF price_includes_vat IS NOT NULL THEN
    update_query := update_query || ', price_includes_vat = $15';
  END IF;
  IF margin_percentage IS NOT NULL THEN
    update_query := update_query || ', margin_percentage = $16';
  END IF;
  IF base_price_cents IS NOT NULL THEN
    update_query := update_query || ', base_price_cents = $17';
  END IF;
  
  update_query := update_query || ' WHERE id = $1';
  
  -- Execute update
  EXECUTE update_query USING 
    wine_id, wine_name, vintage, grape_varieties, color, producer_id,
    cost_currency, cost_amount, exchange_rate_source, exchange_rate_date,
    exchange_rate_period_start, exchange_rate_period_end, exchange_rate,
    alcohol_tax_cents, price_includes_vat, margin_percentage, base_price_cents;
  
  -- Get updated wine
  SELECT * INTO wine_record FROM wines WHERE id = wine_id;
  
  -- Return wine as JSON
  RETURN row_to_json(wine_record);
END;
$$ LANGUAGE plpgsql;
