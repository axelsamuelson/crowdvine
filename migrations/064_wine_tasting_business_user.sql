-- Link wine tasting sessions to a business user (optional).
-- Session and ratings can be attributed to this user for reporting.
ALTER TABLE wine_tasting_sessions
  ADD COLUMN IF NOT EXISTS business_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN wine_tasting_sessions.business_user_id IS
  'Optional profile (e.g. producer/business) the session belongs to; session and ratings are linked to this user.';

CREATE INDEX IF NOT EXISTS idx_wine_tasting_sessions_business_user_id
  ON wine_tasting_sessions(business_user_id);
