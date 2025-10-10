-- Migration: Add 'discount' to perk_type enum
-- Purpose: Allow storing member discount percentages in membership_perks table

-- Add 'discount' to the perk_type enum
ALTER TYPE perk_type ADD VALUE IF NOT EXISTS 'discount';

-- Insert default discount perks for each level
INSERT INTO membership_perks (level, perk_type, perk_value, description, sort_order, is_active)
VALUES 
  ('basic', 'discount', '0%', 'No discount', 10, true),
  ('brons', 'discount', '3%', '3% discount on all wine purchases', 10, true),
  ('silver', 'discount', '5%', '5% discount on all wine purchases', 10, true),
  ('guld', 'discount', '10%', '10% discount on all wine purchases', 10, true),
  ('admin', 'discount', '15%', '15% discount on all wine purchases', 10, true)
ON CONFLICT (level, perk_type) DO NOTHING;

-- Comment
COMMENT ON TYPE perk_type IS 'Types of perks available in membership system: invite_quota, queue_priority, fee_reduction, early_access, exclusive_drops, pallet_hosting, producer_contact, discount';

