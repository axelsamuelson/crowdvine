-- =====================================================
-- Migration 043: Integrate Progression Buffs with Level-Up
-- =====================================================
-- 
-- Updates check_and_upgrade_level function to clear progression buffs
-- when a user levels up, and adds new IP event types to the enum.
--
-- Author: PACT System
-- Date: 2025-01-11
-- =====================================================

-- =====================================================
-- 1. Add new event types to ip_event_type enum
-- =====================================================

-- Add new event types for Membership Ladder v2
ALTER TYPE ip_event_type ADD VALUE IF NOT EXISTS 'invite_second_order';
ALTER TYPE ip_event_type ADD VALUE IF NOT EXISTS 'own_order_large';
ALTER TYPE ip_event_type ADD VALUE IF NOT EXISTS 'pallet_milestone_6';
ALTER TYPE ip_event_type ADD VALUE IF NOT EXISTS 'pallet_milestone_12';
ALTER TYPE ip_event_type ADD VALUE IF NOT EXISTS 'review_submitted';
ALTER TYPE ip_event_type ADD VALUE IF NOT EXISTS 'share_action';

-- =====================================================
-- 2. Update check_and_upgrade_level to clear buffs
-- =====================================================

CREATE OR REPLACE FUNCTION check_and_upgrade_level(p_user_id UUID)
RETURNS membership_level AS $$
DECLARE
  current_membership RECORD;
  new_level membership_level;
  old_level membership_level;
BEGIN
  -- Get current membership
  SELECT * INTO current_membership 
  FROM user_memberships 
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN 'requester';
  END IF;
  
  -- Store old level
  old_level := current_membership.level;
  
  -- Don't auto-downgrade admin
  IF current_membership.level = 'admin' THEN
    RETURN 'admin';
  END IF;
  
  -- Calculate new level from points
  new_level := get_level_from_points(current_membership.impact_points);
  
  -- If level changed, update and log
  IF new_level != current_membership.level THEN
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
    
    -- Clear progression buffs on level-up (new in v2)
    PERFORM clear_progression_buffs_on_level_up(p_user_id);
    
    RAISE NOTICE 'User % upgraded from % to %', p_user_id, old_level, new_level;
  END IF;
  
  RETURN new_level;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Migration complete
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 043 completed successfully';
  RAISE NOTICE '   - New IP event types added';
  RAISE NOTICE '   - check_and_upgrade_level updated to clear progression buffs';
END $$;

