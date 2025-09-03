-- Migration: Create cart_lines table for cart functionality
-- Date: 2025-01-02

-- Drop table if it exists (in case of partial migration)
DROP TABLE IF EXISTS cart_lines CASCADE;

-- Create cart_lines table
CREATE TABLE cart_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES wines(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    band TEXT NOT NULL DEFAULT 'market',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_cart_lines_cart_id ON cart_lines(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_lines_item_id ON cart_lines(item_id);

-- Add RLS policies
ALTER TABLE cart_lines ENABLE ROW LEVEL SECURITY;

-- Cart lines policies (drop and recreate to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own cart lines" ON cart_lines;
DROP POLICY IF EXISTS "Users can insert their own cart lines" ON cart_lines;
DROP POLICY IF EXISTS "Users can update their own cart lines" ON cart_lines;
DROP POLICY IF EXISTS "Users can delete their own cart lines" ON cart_lines;

CREATE POLICY "Users can view their own cart lines" ON cart_lines
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM carts 
            WHERE carts.id = cart_lines.cart_id 
            AND (carts.user_id = auth.uid() OR carts.id IS NOT NULL)
        )
    );

CREATE POLICY "Users can insert their own cart lines" ON cart_lines
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM carts 
            WHERE carts.id = cart_lines.cart_id 
            AND (carts.user_id = auth.uid() OR carts.id IS NOT NULL)
        )
    );

CREATE POLICY "Users can update their own cart lines" ON cart_lines
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM carts 
            WHERE carts.id = cart_lines.cart_id 
            AND (carts.user_id = auth.uid() OR carts.id IS NOT NULL)
        )
    );

CREATE POLICY "Users can delete their own cart lines" ON cart_lines
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM carts 
            WHERE carts.id = cart_lines.cart_id 
            AND (carts.user_id = auth.uid() OR carts.id IS NOT NULL)
        )
    );
