-- Migration 040: Add 'discount' to perk_type enum
-- Purpose: Allow storing member discount percentages in membership_perks table

-- IMPORTANT: This must be run in TWO steps due to PostgreSQL enum constraints
-- Step 1: Add enum value (run this first, then commit/wait)

ALTER TYPE perk_type ADD VALUE IF NOT EXISTS 'discount';

-- STOP HERE - Commit this transaction
-- Then run the second part below in a NEW transaction:

-- Step 2: Insert default discount perks (run this AFTER step 1 is committed)
-- Copy and run this separately:

/*
INSERT INTO membership_perks (level, perk_type, perk_value, description, sort_order, is_active)
VALUES 
  ('basic', 'discount', '0%', 'No discount', 10, true),
  ('brons', 'discount', '3%', '3% discount on all wine purchases', 10, true),
  ('silver', 'discount', '5%', '5% discount on all wine purchases', 10, true),
  ('guld', 'discount', '10%', '10% discount on all wine purchases', 10, true),
  ('admin', 'discount', '15%', '15% discount on all wine purchases', 10, true)
ON CONFLICT (level, perk_type) DO NOTHING;
*/

