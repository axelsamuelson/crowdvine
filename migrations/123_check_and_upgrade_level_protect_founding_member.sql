-- Protect founding_member from IP-driven level changes.
-- This migration updates check_and_upgrade_level to early-return when the current membership level
-- is founding_member, so points-based logic never overwrites it.
--
-- Implementation: copy the current function body from Migration 044 and add ONLY the founding_member guard
-- immediately after loading the user_memberships row.

CREATE OR REPLACE FUNCTION check_and_upgrade_level(p_user_id UUID)
RETURNS membership_level AS $$
DECLARE
  current_membership RECORD;
  new_level membership_level;
  old_level membership_level;
  level_order_map JSONB;
  old_level_order INTEGER;
  new_level_order INTEGER;
BEGIN
  -- Get current membership
  SELECT * INTO current_membership 
  FROM user_memberships 
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN 'requester';
  END IF;

  -- Guard: Founding Member is a parallel track; never overwrite via IP-based level logic.
  IF current_membership.level = 'founding_member' THEN
    RETURN 'founding_member';
  END IF;
  
  -- Store old level
  old_level := current_membership.level;
  
  -- Don't auto-downgrade admin
  IF current_membership.level = 'admin' THEN
    RETURN 'admin';
  END IF;
  
  -- Calculate new level from points
  new_level := get_level_from_points(current_membership.impact_points);
  
  -- Define level order (higher number = higher level)
  level_order_map := '{"requester": 0, "basic": 1, "brons": 2, "silver": 3, "guld": 4, "admin": 5}'::JSONB;
  
  old_level_order := (level_order_map->>old_level::TEXT)::INTEGER;
  new_level_order := (level_order_map->>new_level::TEXT)::INTEGER;
  
  -- CRITICAL FIX: Only upgrade, never downgrade
  -- If new level is higher than current level, upgrade
  -- If new level is lower or equal, keep current level (no downgrade)
  IF new_level_order > old_level_order THEN
    -- This is an UPGRADE - proceed
    UPDATE user_memberships
    SET 
      level = new_level,
      invite_quota_monthly = get_invite_quota_for_level(new_level),
      level_assigned_at = NOW(),
      updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Log the upgrade
    INSERT INTO impact_point_events (
      user_id,
      event_type,
      points_earned,
      description
    ) VALUES (
      p_user_id,
      'level_upgrade',
      0,
      'Upgraded from ' || old_level::TEXT || ' to ' || new_level::TEXT
    );
    
    -- Clear progression buffs on level-up (from v2)
    PERFORM clear_progression_buffs_on_level_up(p_user_id);
    
    RAISE NOTICE 'User % upgraded from % to %', p_user_id, old_level, new_level;
    
    RETURN new_level;
  ELSE
    -- New level is lower or equal - KEEP current level (no downgrade)
    RAISE NOTICE 'User % staying at % (calculated % from IP, but we never downgrade)', 
      p_user_id, old_level, new_level;
    RETURN old_level;
  END IF;
END;
$$ LANGUAGE plpgsql;

