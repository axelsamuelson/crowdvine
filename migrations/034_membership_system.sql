-- ================================================
-- PACT Wines Membership Ladder System
-- Migration 034: Complete membership system implementation
-- ================================================

-- ================================================
-- 1. CREATE ENUMS
-- ================================================

-- Membership levels (requester → basic → brons → silver → guld → admin)
CREATE TYPE membership_level AS ENUM (
  'requester',
  'basic',
  'brons',
  'silver',
  'guld',
  'admin'
);

-- Impact Point event types
CREATE TYPE ip_event_type AS ENUM (
  'invite_signup',      -- +1 IP when invited user registers
  'invite_reservation', -- +2 IP when invited user makes first reservation
  'own_order',          -- +1 IP for own order ≥6 bottles
  'pallet_milestone',   -- +3 IP at 3, 6, 9 pallets milestone
  'manual_adjustment',  -- Admin manual adjustment
  'level_upgrade',      -- Logged when user levels up
  'migration'           -- Initial migration from old rewards
);

-- Perk types for different levels
CREATE TYPE perk_type AS ENUM (
  'invite_quota',
  'queue_priority',
  'fee_reduction',
  'early_access',
  'exclusive_drops',
  'pallet_hosting',
  'producer_contact'
);

-- ================================================
-- 2. CREATE TABLES
-- ================================================

-- User Memberships Table
CREATE TABLE IF NOT EXISTS user_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  level membership_level NOT NULL DEFAULT 'requester',
  impact_points INTEGER NOT NULL DEFAULT 0,
  invite_quota_monthly INTEGER NOT NULL DEFAULT 0,
  invites_used_this_month INTEGER NOT NULL DEFAULT 0,
  last_quota_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  level_assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Impact Point Events Table (audit log)
CREATE TABLE IF NOT EXISTS impact_point_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type ip_event_type NOT NULL,
  points_earned INTEGER NOT NULL DEFAULT 0,
  related_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  related_order_id UUID REFERENCES order_reservations(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Membership Perks Configuration Table
CREATE TABLE IF NOT EXISTS membership_perks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level membership_level NOT NULL,
  perk_type perk_type NOT NULL,
  perk_value TEXT,
  description TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(level, perk_type)
);

-- ================================================
-- 3. CREATE INDEXES
-- ================================================

CREATE INDEX IF NOT EXISTS idx_user_memberships_user_id ON user_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memberships_level ON user_memberships(level);
CREATE INDEX IF NOT EXISTS idx_user_memberships_impact_points ON user_memberships(impact_points);

CREATE INDEX IF NOT EXISTS idx_impact_point_events_user_id ON impact_point_events(user_id);
CREATE INDEX IF NOT EXISTS idx_impact_point_events_type ON impact_point_events(event_type);
CREATE INDEX IF NOT EXISTS idx_impact_point_events_created_at ON impact_point_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_membership_perks_level ON membership_perks(level);
CREATE INDEX IF NOT EXISTS idx_membership_perks_active ON membership_perks(is_active);

-- ================================================
-- 4. ENABLE RLS
-- ================================================

ALTER TABLE user_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE impact_point_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_perks ENABLE ROW LEVEL SECURITY;

-- ================================================
-- 5. RLS POLICIES
-- ================================================

-- User Memberships Policies
CREATE POLICY "Users can read own membership" ON user_memberships
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all memberships" ON user_memberships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update memberships" ON user_memberships
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can insert memberships" ON user_memberships
  FOR INSERT WITH CHECK (true);

-- Impact Point Events Policies
CREATE POLICY "Users can read own events" ON impact_point_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all events" ON impact_point_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can insert events" ON impact_point_events
  FOR INSERT WITH CHECK (true);

-- Membership Perks Policies (read-only for users)
CREATE POLICY "Everyone can read active perks" ON membership_perks
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage perks" ON membership_perks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ================================================
-- 6. FUNCTIONS
-- ================================================

-- Function to get invite quota for a membership level
CREATE OR REPLACE FUNCTION get_invite_quota_for_level(lvl membership_level)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE lvl
    WHEN 'requester' THEN 0
    WHEN 'basic' THEN 2
    WHEN 'brons' THEN 5
    WHEN 'silver' THEN 12
    WHEN 'guld' THEN 50
    WHEN 'admin' THEN 999999
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get level from impact points
CREATE OR REPLACE FUNCTION get_level_from_points(points INTEGER)
RETURNS membership_level AS $$
BEGIN
  IF points >= 35 THEN
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

-- Function to auto-upgrade user level based on IP
CREATE OR REPLACE FUNCTION check_and_upgrade_level(p_user_id UUID)
RETURNS membership_level AS $$
DECLARE
  current_membership RECORD;
  new_level membership_level;
BEGIN
  -- Get current membership
  SELECT * INTO current_membership 
  FROM user_memberships 
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN 'requester';
  END IF;
  
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
      'Upgraded to ' || new_level::TEXT
    );
  END IF;
  
  RETURN new_level;
END;
$$ LANGUAGE plpgsql;

-- Function to award impact points
CREATE OR REPLACE FUNCTION award_impact_points(
  p_user_id UUID,
  p_event_type ip_event_type,
  p_points INTEGER,
  p_related_user_id UUID DEFAULT NULL,
  p_related_order_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  new_total INTEGER;
BEGIN
  -- Add points to membership
  UPDATE user_memberships
  SET 
    impact_points = impact_points + p_points,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING impact_points INTO new_total;
  
  -- Log the event
  INSERT INTO impact_point_events (
    user_id,
    event_type,
    points_earned,
    related_user_id,
    related_order_id,
    description
  ) VALUES (
    p_user_id,
    p_event_type,
    p_points,
    p_related_user_id,
    p_related_order_id,
    p_description
  );
  
  -- Check if level should be upgraded
  PERFORM check_and_upgrade_level(p_user_id);
  
  RETURN new_total;
END;
$$ LANGUAGE plpgsql;

-- Function to reset monthly invite quotas (run via cron)
CREATE OR REPLACE FUNCTION reset_monthly_invite_quotas()
RETURNS void AS $$
BEGIN
  UPDATE user_memberships
  SET 
    invites_used_this_month = 0,
    last_quota_reset = NOW(),
    updated_at = NOW()
  WHERE last_quota_reset < DATE_TRUNC('month', NOW());
END;
$$ LANGUAGE plpgsql;

-- Function to auto-create membership on user signup
CREATE OR REPLACE FUNCTION handle_new_user_membership()
RETURNS TRIGGER AS $$
DECLARE
  invite_level membership_level;
  start_level membership_level;
BEGIN
  -- Check if user was invited with a specific start level
  SELECT initial_level INTO invite_level
  FROM invitation_codes
  WHERE used_by = NEW.id
  LIMIT 1;
  
  -- Use invite level if specified, otherwise default to 'basic'
  start_level := COALESCE(invite_level, 'basic');
  
  -- Create membership record
  INSERT INTO user_memberships (
    user_id,
    level,
    impact_points,
    invite_quota_monthly
  ) VALUES (
    NEW.id,
    start_level,
    0,
    get_invite_quota_for_level(start_level)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create membership on user signup
DROP TRIGGER IF EXISTS on_user_membership_created ON auth.users;
CREATE TRIGGER on_user_membership_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_membership();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_memberships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER trigger_user_memberships_updated_at
  BEFORE UPDATE ON user_memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_memberships_updated_at();

-- ================================================
-- 7. ADD COLUMNS TO EXISTING TABLES
-- ================================================

-- Add initial_level to invitation_codes for admin-created invites
ALTER TABLE invitation_codes 
ADD COLUMN IF NOT EXISTS initial_level membership_level DEFAULT 'basic';

-- ================================================
-- 8. POPULATE MEMBERSHIP PERKS
-- ================================================

-- Basic Level Perks
INSERT INTO membership_perks (level, perk_type, perk_value, description, sort_order) VALUES
('basic', 'invite_quota', '2', 'Invite 2 friends per month', 1),
('basic', 'queue_priority', 'none', 'Standard queue priority', 2);

-- Brons Level Perks
INSERT INTO membership_perks (level, perk_type, perk_value, description, sort_order) VALUES
('brons', 'invite_quota', '5', 'Invite 5 friends per month', 1),
('brons', 'queue_priority', 'low', 'Light queue priority boost', 2),
('brons', 'fee_reduction', '50%', 'Service fee reduced by 50% (monthly cap applies)', 3);

-- Silver Level Perks
INSERT INTO membership_perks (level, perk_type, perk_value, description, sort_order) VALUES
('silver', 'invite_quota', '12', 'Invite 12 friends per month', 1),
('silver', 'queue_priority', 'medium', 'Priority queue access', 2),
('silver', 'early_access', '24h', '24-hour early access to new drops', 3),
('silver', 'fee_reduction', 'capped', 'Fee cap per order', 4);

-- Guld Level Perks
INSERT INTO membership_perks (level, perk_type, perk_value, description, sort_order) VALUES
('guld', 'invite_quota', '50', 'Invite 50 friends per month', 1),
('guld', 'queue_priority', 'high', 'Highest queue priority', 2),
('guld', 'early_access', '72h', '72-hour early access to new drops', 3),
('guld', 'exclusive_drops', 'true', 'Access to exclusive member-only drops', 4),
('guld', 'fee_reduction', 'waived', 'Service fees waived (monthly cap applies)', 5);

-- Admin Level Perks
INSERT INTO membership_perks (level, perk_type, perk_value, description, sort_order) VALUES
('admin', 'invite_quota', 'unlimited', 'Unlimited invites', 1),
('admin', 'pallet_hosting', 'true', 'Can create and host pallets', 2),
('admin', 'producer_contact', 'true', 'Direct contact with producers', 3),
('admin', 'queue_priority', 'max', 'Maximum priority', 4),
('admin', 'fee_reduction', 'waived', 'All fees waived', 5);

-- ================================================
-- 9. MIGRATE EXISTING USERS
-- ================================================

-- This section will be run manually/reviewed for the 0-10 existing users
-- For each user:
-- 1. Count their invitation_codes where used_at IS NOT NULL
-- 2. Estimate IP based on invites
-- 3. Create user_memberships record with appropriate level

-- Example migration query (to be run per user):
/*
INSERT INTO user_memberships (user_id, level, impact_points, invite_quota_monthly)
SELECT 
  id as user_id,
  get_level_from_points(
    -- Calculate IP: +1 per accepted invite, estimate additional points
    (SELECT COUNT(*) FROM invitation_codes WHERE created_by = auth.users.id AND used_at IS NOT NULL)
  ) as level,
  (SELECT COUNT(*) FROM invitation_codes WHERE created_by = auth.users.id AND used_at IS NOT NULL) as impact_points,
  get_invite_quota_for_level(
    get_level_from_points(
      (SELECT COUNT(*) FROM invitation_codes WHERE created_by = auth.users.id AND used_at IS NOT NULL)
    )
  ) as invite_quota_monthly
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM user_memberships WHERE user_id = auth.users.id
);
*/

-- ================================================
-- 10. COMMENTS & DOCUMENTATION
-- ================================================

COMMENT ON TABLE user_memberships IS 'Stores user membership levels and impact points for the PACT Wines membership ladder system';
COMMENT ON TABLE impact_point_events IS 'Audit log of all impact point earning events';
COMMENT ON TABLE membership_perks IS 'Configuration table defining perks available at each membership level';

COMMENT ON COLUMN user_memberships.impact_points IS 'Total accumulated impact points that determine membership level';
COMMENT ON COLUMN user_memberships.invite_quota_monthly IS 'Number of invites allowed per month based on membership level';
COMMENT ON COLUMN user_memberships.invites_used_this_month IS 'Counter for invites used this month, resets on 1st of each month';

-- ================================================
-- MIGRATION COMPLETE
-- ================================================

