-- =====================================================
-- Migration 042: Progression Buffs & Rewards System
-- =====================================================
-- 
-- Creates tables and functions for PACT Membership Ladder v2:
-- - user_progression_buffs: Temporary percentage bonuses earned during level progression
-- - progression_rewards: Configurable rewards per level segment and IP threshold
-- - Helper functions for managing buffs
--
-- Author: PACT System
-- Date: 2025-01-11
-- =====================================================

-- =====================================================
-- 1. Create user_progression_buffs table
-- =====================================================

CREATE TABLE IF NOT EXISTS user_progression_buffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buff_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  buff_description TEXT,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_on_use BOOLEAN NOT NULL DEFAULT TRUE,
  used_at TIMESTAMPTZ,
  level_segment VARCHAR(20) NOT NULL, -- 'basic-bronze', 'bronze-silver', 'silver-gold'
  related_ip_event_id UUID REFERENCES impact_point_events(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_progression_buffs_user_id ON user_progression_buffs(user_id);
CREATE INDEX idx_user_progression_buffs_active ON user_progression_buffs(user_id, used_at) WHERE used_at IS NULL;
CREATE INDEX idx_user_progression_buffs_segment ON user_progression_buffs(level_segment);

-- Comments
COMMENT ON TABLE user_progression_buffs IS 'Stores temporary percentage bonuses earned during level progression';
COMMENT ON COLUMN user_progression_buffs.buff_percentage IS 'Percentage discount (e.g., 0.5 for 0.5%)';
COMMENT ON COLUMN user_progression_buffs.level_segment IS 'Level segment where buff was earned (basic-bronze, bronze-silver, silver-gold)';
COMMENT ON COLUMN user_progression_buffs.expires_on_use IS 'If true, buff is marked used_at when applied to an order';

-- =====================================================
-- 2. Create progression_rewards table
-- =====================================================

CREATE TABLE IF NOT EXISTS progression_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_segment VARCHAR(20) NOT NULL, -- 'basic-bronze', 'bronze-silver', 'silver-gold'
  ip_threshold INTEGER NOT NULL, -- IP value to trigger this reward
  reward_type VARCHAR(50) NOT NULL, -- 'buff_percentage', 'badge', 'early_access_token', 'fee_waiver', 'celebration'
  reward_value TEXT, -- JSON or plain value depending on reward_type
  reward_description TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_level_segment CHECK (level_segment IN ('basic-bronze', 'bronze-silver', 'silver-gold')),
  CONSTRAINT valid_reward_type CHECK (reward_type IN ('buff_percentage', 'badge', 'early_access_token', 'fee_waiver', 'celebration'))
);

-- Indexes
CREATE INDEX idx_progression_rewards_segment ON progression_rewards(level_segment);
CREATE INDEX idx_progression_rewards_active ON progression_rewards(is_active) WHERE is_active = TRUE;
CREATE UNIQUE INDEX idx_progression_rewards_segment_threshold ON progression_rewards(level_segment, ip_threshold, reward_type);

-- Comments
COMMENT ON TABLE progression_rewards IS 'Configurable rewards awarded at specific IP milestones within level segments';
COMMENT ON COLUMN progression_rewards.ip_threshold IS 'Exact IP value that triggers this reward';
COMMENT ON COLUMN progression_rewards.reward_type IS 'Type of reward: buff_percentage (temp discount), badge, early_access_token, fee_waiver, celebration';
COMMENT ON COLUMN progression_rewards.reward_value IS 'Value for the reward (e.g., "0.5" for 0.5% buff, "1" for 1 token)';

-- =====================================================
-- 3. Insert baseline progression rewards
-- =====================================================

-- Basic → Bronze rewards (0-4 IP)
INSERT INTO progression_rewards (level_segment, ip_threshold, reward_type, reward_value, reward_description, sort_order) VALUES
  ('basic-bronze', 2, 'buff_percentage', '0.5', 'Progress bonus: +0.5% on next reservation', 10),
  ('basic-bronze', 4, 'buff_percentage', '0.5', 'Progress bonus: +0.5% on next reservation', 20),
  ('basic-bronze', 4, 'badge', 'pact_initiate', 'Unlock: PACT Initiate badge', 21);

-- Bronze → Silver rewards (5-14 IP)
INSERT INTO progression_rewards (level_segment, ip_threshold, reward_type, reward_value, reward_description, sort_order) VALUES
  ('bronze-silver', 10, 'early_access_token', '1', 'Early Drop Access Token (one-time)', 10),
  ('bronze-silver', 14, 'fee_waiver', '1', 'Free service fee (one-time)', 20);

-- Silver → Gold rewards (15-34 IP)
INSERT INTO progression_rewards (level_segment, ip_threshold, reward_type, reward_value, reward_description, sort_order) VALUES
  ('silver-gold', 20, 'buff_percentage', '1.0', 'Progress bonus: +1% on next reservation', 10),
  ('silver-gold', 25, 'buff_percentage', '1.0', 'Progress bonus: +1% on next reservation', 20),
  ('silver-gold', 30, 'buff_percentage', '1.0', 'Progress bonus: +1% on next reservation', 30),
  ('silver-gold', 30, 'badge', 'silver_collector', 'Unlock: Silver Collector Pack', 31),
  ('silver-gold', 35, 'celebration', 'gold_unlock', 'Gold level unlocked! 🎉', 40);

-- =====================================================
-- 4. Helper functions
-- =====================================================

-- Function to get active (unused) buffs for a user
CREATE OR REPLACE FUNCTION get_active_progression_buffs(p_user_id UUID)
RETURNS TABLE (
  buff_id UUID,
  buff_percentage DECIMAL(5,2),
  buff_description TEXT,
  earned_at TIMESTAMPTZ,
  level_segment VARCHAR(20)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id,
    user_progression_buffs.buff_percentage,
    user_progression_buffs.buff_description,
    user_progression_buffs.earned_at,
    user_progression_buffs.level_segment
  FROM user_progression_buffs
  WHERE user_progression_buffs.user_id = p_user_id
    AND used_at IS NULL
    AND expires_on_use = TRUE
  ORDER BY earned_at ASC;
END;
$$;

-- Function to calculate total active buff percentage
CREATE OR REPLACE FUNCTION calculate_total_buff_percentage(p_user_id UUID)
RETURNS DECIMAL(5,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total DECIMAL(5,2);
BEGIN
  SELECT COALESCE(SUM(buff_percentage), 0)
  INTO v_total
  FROM user_progression_buffs
  WHERE user_id = p_user_id
    AND used_at IS NULL
    AND expires_on_use = TRUE;
  
  RETURN v_total;
END;
$$;

-- Function to mark buffs as used
CREATE OR REPLACE FUNCTION apply_progression_buffs(p_user_id UUID, p_order_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  UPDATE user_progression_buffs
  SET 
    used_at = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND used_at IS NULL
    AND expires_on_use = TRUE;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN v_updated_count;
END;
$$;

-- Function to clear all buffs for a user (on level-up)
CREATE OR REPLACE FUNCTION clear_progression_buffs_on_level_up(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Mark unused buffs as used (clear them)
  UPDATE user_progression_buffs
  SET 
    used_at = NOW(),
    updated_at = NOW(),
    buff_description = buff_description || ' (cleared on level-up)'
  WHERE user_id = p_user_id
    AND used_at IS NULL;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

-- Function to get progression rewards for a level segment
CREATE OR REPLACE FUNCTION get_progression_rewards_for_segment(p_level_segment VARCHAR(20))
RETURNS TABLE (
  reward_id UUID,
  ip_threshold INTEGER,
  reward_type VARCHAR(50),
  reward_value TEXT,
  reward_description TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id,
    progression_rewards.ip_threshold,
    progression_rewards.reward_type,
    progression_rewards.reward_value,
    progression_rewards.reward_description
  FROM progression_rewards
  WHERE level_segment = p_level_segment
    AND is_active = TRUE
  ORDER BY sort_order ASC, ip_threshold ASC;
END;
$$;

-- =====================================================
-- 5. RLS Policies
-- =====================================================

-- Enable RLS
ALTER TABLE user_progression_buffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE progression_rewards ENABLE ROW LEVEL SECURITY;

-- Users can view their own buffs
CREATE POLICY "Users can view own progression buffs"
  ON user_progression_buffs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view all active progression rewards (config)
CREATE POLICY "Users can view active progression rewards"
  ON progression_rewards
  FOR SELECT
  USING (is_active = TRUE);

-- Service role can manage everything
CREATE POLICY "Service role full access to progression buffs"
  ON user_progression_buffs
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access to progression rewards"
  ON progression_rewards
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- 6. Triggers for updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_progression_buffs_updated_at
  BEFORE UPDATE ON user_progression_buffs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_progression_rewards_updated_at
  BEFORE UPDATE ON progression_rewards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Migration complete
-- =====================================================

-- Verify tables were created
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_progression_buffs') AND
     EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'progression_rewards') THEN
    RAISE NOTICE '✅ Migration 042 completed successfully';
    RAISE NOTICE '   - user_progression_buffs table created';
    RAISE NOTICE '   - progression_rewards table created';
    RAISE NOTICE '   - Helper functions created';
    RAISE NOTICE '   - Baseline rewards inserted';
  ELSE
    RAISE EXCEPTION '❌ Migration 042 failed - tables not created';
  END IF;
END $$;

