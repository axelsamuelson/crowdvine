-- Migration: Add source column to cart_items table
-- Date: 2025-01-XX
-- Description: Adds source column to track whether items come from producer or warehouse

-- Add source column to cart_items table
ALTER TABLE cart_items 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'producer' 
CHECK (source IN ('producer', 'warehouse'));

-- Update unique constraint to include source (so same wine can be added with different sources)
-- First, try to drop the old unique constraint if it exists
DO $$
BEGIN
    -- Try to drop constraint by name (PostgreSQL will error if it doesn't exist, but we catch it)
    ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_cart_id_wine_id_key;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Drop the unique index if it exists and create a new one with source
DROP INDEX IF EXISTS cart_items_cart_id_wine_id_key;
DROP INDEX IF EXISTS cart_items_cart_id_wine_id_source_unique;

-- Create new unique index that includes source
CREATE UNIQUE INDEX cart_items_cart_id_wine_id_source_unique 
ON cart_items(cart_id, wine_id, source);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_cart_items_source ON cart_items(source);
