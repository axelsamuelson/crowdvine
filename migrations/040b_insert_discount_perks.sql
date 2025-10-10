-- Migration 040b: Insert default discount perks
-- Run this AFTER migration 040 has been committed

-- Insert default discount perks for each level
INSERT INTO membership_perks (level, perk_type, perk_value, description, sort_order, is_active)
VALUES 
  ('basic', 'discount', '0%', 'No discount', 10, true),
  ('brons', 'discount', '3%', '3% discount on all wine purchases', 10, true),
  ('silver', 'discount', '5%', '5% discount on all wine purchases', 10, true),
  ('guld', 'discount', '10%', '10% discount on all wine purchases', 10, true),
  ('admin', 'discount', '15%', '15% discount on all wine purchases', 10, true)
ON CONFLICT (level, perk_type) DO NOTHING;

-- Verify
SELECT level, perk_type, perk_value, description 
FROM membership_perks 
WHERE perk_type = 'discount'
ORDER BY 
  CASE level 
    WHEN 'basic' THEN 1 
    WHEN 'brons' THEN 2 
    WHEN 'silver' THEN 3 
    WHEN 'guld' THEN 4 
    WHEN 'admin' THEN 5 
  END;

