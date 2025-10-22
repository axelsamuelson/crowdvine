-- Migration 050: Create Analytics Tables
-- Main events table for tracking all user actions
CREATE TABLE user_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL,
  event_metadata JSONB DEFAULT '{}',
  page_url TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast querying
CREATE INDEX idx_user_events_user_id ON user_events(user_id);
CREATE INDEX idx_user_events_session_id ON user_events(session_id);
CREATE INDEX idx_user_events_event_type ON user_events(event_type);
CREATE INDEX idx_user_events_created_at ON user_events(created_at DESC);
CREATE INDEX idx_user_events_category ON user_events(event_category);

-- User journey view for funnel analysis
CREATE VIEW user_journey_funnel AS
SELECT 
  user_id,
  MIN(CASE WHEN event_type = 'access_request_submitted' THEN created_at END) as access_requested_at,
  MIN(CASE WHEN event_type = 'access_approved' THEN created_at END) as access_approved_at,
  MIN(CASE WHEN event_type = 'user_first_login' THEN created_at END) as first_login_at,
  MIN(CASE WHEN event_type = 'product_viewed' THEN created_at END) as first_product_view_at,
  MIN(CASE WHEN event_type = 'add_to_cart' THEN created_at END) as first_add_to_cart_at,
  MIN(CASE WHEN event_type = 'cart_validation_passed' THEN created_at END) as cart_validation_passed_at,
  MIN(CASE WHEN event_type = 'checkout_started' THEN created_at END) as checkout_started_at,
  MIN(CASE WHEN event_type = 'reservation_completed' THEN created_at END) as reservation_completed_at
FROM user_events
WHERE user_id IS NOT NULL
GROUP BY user_id;

-- Enable RLS
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;

-- Admin can see all events
CREATE POLICY "Admins can view all events" ON user_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Users can insert their own events
CREATE POLICY "Users can insert their own events" ON user_events
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Function for cohort analysis
CREATE OR REPLACE FUNCTION get_cohort_analysis()
RETURNS TABLE (
  week TEXT,
  cohort_size BIGINT,
  active_users BIGINT,
  converted_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(DATE_TRUNC('week', created_at), 'YYYY-WW') as week,
    COUNT(DISTINCT user_id) as cohort_size,
    COUNT(DISTINCT CASE WHEN event_type = 'user_login' THEN user_id END) as active_users,
    COUNT(DISTINCT CASE WHEN event_type = 'reservation_completed' THEN user_id END) as converted_users
  FROM user_events
  WHERE created_at >= NOW() - INTERVAL '12 weeks'
  GROUP BY week
  ORDER BY week;
END;
$$ LANGUAGE plpgsql;
