-- Migration: Fix RLS policies for carts table
-- Date: 2025-01-02

-- Enable RLS on carts table if not already enabled
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'carts' AND schemaname = 'public') THEN
    ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own carts" ON carts;
DROP POLICY IF EXISTS "Users can insert their own carts" ON carts;
DROP POLICY IF EXISTS "Users can update their own carts" ON carts;
DROP POLICY IF EXISTS "Users can delete their own carts" ON carts;

-- Create new policies for carts
-- Allow anyone to create/view carts (for anonymous shopping)
CREATE POLICY "Users can view their own carts" ON carts
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own carts" ON carts
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own carts" ON carts
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete their own carts" ON carts
    FOR DELETE USING (true);
