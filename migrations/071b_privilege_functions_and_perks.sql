-- Migration 071b: Privilege level – functions and perks
-- Run AFTER 071a has been committed

-- Update get_invite_quota_for_level to include privilege
CREATE OR REPLACE FUNCTION get_invite_quota_for_level(lvl membership_level)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE lvl
    WHEN 'requester' THEN 0
    WHEN 'basic' THEN 2
    WHEN 'brons' THEN 5
    WHEN 'silver' THEN 12
    WHEN 'guld' THEN 50
    WHEN 'privilege' THEN 100
    WHEN 'admin' THEN 999999
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update get_level_from_points: guld 35-69, privilege 70+
CREATE OR REPLACE FUNCTION get_level_from_points(points INTEGER)
RETURNS membership_level AS $$
BEGIN
  IF points >= 70 THEN
    RETURN 'privilege';
  ELSIF points >= 35 THEN
    RETURN 'guld';
  ELSIF points >= 15 THEN
    RETURN 'silver';
  ELSIF points >= 5 THEN
    RETURN 'brons';
  ELSE
    RETURN 'basic';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add discount perk for privilege (15% - above gold's 10%)
INSERT INTO membership_perks (level, perk_type, perk_value, description, sort_order, is_active)
VALUES ('privilege', 'discount', '15%', '15% discount on all wine purchases', 10, true)
ON CONFLICT (level, perk_type) DO NOTHING;
