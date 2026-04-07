-- Profiles excluded from objective metrics (user_events, signups, orders tied to user_id)

CREATE TABLE admin_metrics_excluded_profiles (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  note         TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_admin_metrics_excluded_profiles_created_at
  ON admin_metrics_excluded_profiles(created_at DESC);

COMMENT ON TABLE admin_metrics_excluded_profiles IS
  'Excluded users are omitted from admin_refresh_objective_metrics counts (events, profiles, reservations).';
