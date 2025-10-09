-- Complete migration script for Systembolaget pricing
-- This script handles all scenarios and adds missing columns if needed

-- Step 1: Check current table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'wines' 
ORDER BY ordinal_position;

-- Step 2: Add missing columns if they don't exist
-- Add volume_liters column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'wines' AND column_name = 'volume_liters') THEN
        ALTER TABLE wines ADD COLUMN volume_liters DECIMAL(5,3) DEFAULT 0.75;
        RAISE NOTICE 'Added volume_liters column';
    ELSE
        RAISE NOTICE 'volume_liters column already exists';
    END IF;
END $$;

-- Add sb_price column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'wines' AND column_name = 'sb_price') THEN
        ALTER TABLE wines ADD COLUMN sb_price DECIMAL(10,2);
        RAISE NOTICE 'Added sb_price column';
    ELSE
        RAISE NOTICE 'sb_price column already exists';
    END IF;
END $$;

-- Step 3: Create index for sb_price if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_wines_sb_price') THEN
        CREATE INDEX idx_wines_sb_price ON wines(sb_price);
        RAISE NOTICE 'Created sb_price index';
    ELSE
        RAISE NOTICE 'sb_price index already exists';
    END IF;
END $$;

-- Step 4: Show current wines with pricing data
SELECT 
  id,
  wine_name,
  ROUND(base_price_cents / 100, 2) as our_price_sek,
  cost_amount as supplier_price,
  volume_liters,
  sb_price
FROM wines 
ORDER BY wine_name;

-- Step 5: Update sb_price for wines that have cost_amount (supplier price)
-- Using the calculation: cost_amount + 14.7% markup + 5.40 SEK wine markup + alcohol tax + 25% VAT
UPDATE wines 
SET sb_price = ROUND(
  (
    (cost_amount + (cost_amount * 0.147) + 5.40) + 
    (COALESCE(volume_liters, 0.75) * 29.58)
  ) * 1.25, 
  2
)
WHERE cost_amount IS NOT NULL AND cost_amount > 0;

-- Step 6: Show final results with price comparison
SELECT 
  id,
  wine_name,
  ROUND(base_price_cents / 100, 2) as our_price_sek,
  cost_amount as supplier_price,
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
ORDER BY wine_name;
