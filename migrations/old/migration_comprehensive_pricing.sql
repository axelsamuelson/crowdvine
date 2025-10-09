-- Migration to update wines table with comprehensive pricing structure
-- Kör denna SQL i Supabase Dashboard -> SQL Editor

-- Add new pricing columns to wines table
ALTER TABLE wines ADD COLUMN IF NOT EXISTS cost_currency VARCHAR(3) DEFAULT 'EUR';
ALTER TABLE wines ADD COLUMN IF NOT EXISTS cost_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS exchange_rate_source VARCHAR(20) DEFAULT 'current'; -- 'current', 'static_date', 'period_average'
ALTER TABLE wines ADD COLUMN IF NOT EXISTS exchange_rate_date DATE;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS exchange_rate_period_start DATE;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS exchange_rate_period_end DATE;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10,6);
ALTER TABLE wines ADD COLUMN IF NOT EXISTS alcohol_tax_cents INTEGER DEFAULT 0;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS price_includes_vat BOOLEAN DEFAULT true;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS margin_percentage DECIMAL(5,2) DEFAULT 30.00;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS calculated_price_cents INTEGER DEFAULT 0;

-- Create exchange rates table for historical data
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  rate DECIMAL(10,6) NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(from_currency, to_currency, date)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_exchange_rates_lookup ON exchange_rates(from_currency, to_currency, date);

-- Insert some sample exchange rates (you would typically fetch these from an API)
INSERT INTO exchange_rates (from_currency, to_currency, rate, date) VALUES
('EUR', 'SEK', 11.25, CURRENT_DATE),
('USD', 'SEK', 10.45, CURRENT_DATE),
('GBP', 'SEK', 13.20, CURRENT_DATE),
('EUR', 'SEK', 11.30, CURRENT_DATE - INTERVAL '1 day'),
('USD', 'SEK', 10.50, CURRENT_DATE - INTERVAL '1 day'),
('GBP', 'SEK', 13.15, CURRENT_DATE - INTERVAL '1 day')
ON CONFLICT (from_currency, to_currency, date) DO NOTHING;

-- Create function to calculate wine price
CREATE OR REPLACE FUNCTION calculate_wine_price(
  wine_id UUID
) RETURNS INTEGER AS $$
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
  
  -- Get exchange rate based on source
  CASE wine_record.exchange_rate_source
    WHEN 'current' THEN
      SELECT rate INTO exchange_rate 
      FROM exchange_rates 
      WHERE from_currency = wine_record.cost_currency 
        AND to_currency = 'SEK' 
        AND date = CURRENT_DATE
      ORDER BY created_at DESC LIMIT 1;
    WHEN 'static_date' THEN
      SELECT rate INTO exchange_rate 
      FROM exchange_rates 
      WHERE from_currency = wine_record.cost_currency 
        AND to_currency = 'SEK' 
        AND date = wine_record.exchange_rate_date
      ORDER BY created_at DESC LIMIT 1;
    WHEN 'period_average' THEN
      SELECT AVG(rate) INTO exchange_rate 
      FROM exchange_rates 
      WHERE from_currency = wine_record.cost_currency 
        AND to_currency = 'SEK' 
        AND date BETWEEN wine_record.exchange_rate_period_start AND wine_record.exchange_rate_period_end;
    ELSE
      exchange_rate := wine_record.exchange_rate;
  END CASE;
  
  -- If no exchange rate found, use stored rate or default
  IF exchange_rate IS NULL THEN
    exchange_rate := COALESCE(wine_record.exchange_rate, 1.0);
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
    final_price_cents := ROUND(price_after_tax * 1.25 * 100); -- Add 25% VAT
  END IF;
  
  -- Update the wine record
  UPDATE wines 
  SET calculated_price_cents = final_price_cents,
      exchange_rate = exchange_rate
  WHERE id = wine_id;
  
  RETURN final_price_cents;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically calculate price when wine is updated
CREATE OR REPLACE FUNCTION trigger_calculate_wine_price()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM calculate_wine_price(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_wine_price_trigger ON wines;
CREATE TRIGGER calculate_wine_price_trigger
  AFTER INSERT OR UPDATE ON wines
  FOR EACH ROW
  EXECUTE FUNCTION trigger_calculate_wine_price();

-- Update RLS policies
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Allow public read access to exchange rates
CREATE POLICY "Allow public read access to exchange rates" ON exchange_rates
  FOR SELECT USING (true);

-- Allow authenticated users to insert exchange rates (for admin)
CREATE POLICY "Allow authenticated users to insert exchange rates" ON exchange_rates
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Update wines RLS to include new columns
DROP POLICY IF EXISTS "Allow public read access to wines" ON wines;
CREATE POLICY "Allow public read access to wines" ON wines
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert wines" ON wines;
CREATE POLICY "Allow authenticated users to insert wines" ON wines
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to update wines" ON wines;
CREATE POLICY "Allow authenticated users to update wines" ON wines
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to delete wines" ON wines;
CREATE POLICY "Allow authenticated users to delete wines" ON wines
  FOR DELETE USING (auth.role() = 'authenticated');
