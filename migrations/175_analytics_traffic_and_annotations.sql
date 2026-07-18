-- Clean event stream for Trafik tab + campaign annotations for admin analytics.

CREATE OR REPLACE VIEW analytics_sessions_clean AS
SELECT ue.*
FROM user_events ue
WHERE
  (
    ue.user_id IS NULL
    OR ue.user_id NOT IN (
      SELECT e.profile_id FROM admin_metrics_excluded_profiles e
    )
  )
  AND (
    ue.user_agent IS NULL
    OR ue.user_agent !~* 'bot|crawl|spider|headless|lighthouse|slurp'
  )
  AND ue.session_id NOT LIKE 'server\_%'
  AND (
    ue.referrer IS NULL
    OR ue.referrer NOT ILIKE '%localhost%'
  );

COMMENT ON VIEW analytics_sessions_clean IS
  'user_events excluding internal profiles, bot UAs, server-side inserts, and localhost referrers. Used by admin Trafik analytics.';

CREATE TABLE IF NOT EXISTS admin_analytics_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  label TEXT NOT NULL,
  category TEXT NOT NULL CHECK (
    category IN ('seo', 'tiktok', 'b2b', 'product', 'other')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_analytics_annotations_date
  ON admin_analytics_annotations (date DESC);

ALTER TABLE admin_analytics_annotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can select analytics annotations"
  ON admin_analytics_annotations;
DROP POLICY IF EXISTS "Admins can insert analytics annotations"
  ON admin_analytics_annotations;
DROP POLICY IF EXISTS "Admins can update analytics annotations"
  ON admin_analytics_annotations;
DROP POLICY IF EXISTS "Admins can delete analytics annotations"
  ON admin_analytics_annotations;

CREATE POLICY "Admins can select analytics annotations"
  ON admin_analytics_annotations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND (
          profiles.role = 'admin'
          OR (profiles.roles IS NOT NULL AND 'admin' = ANY (profiles.roles))
        )
    )
  );

CREATE POLICY "Admins can insert analytics annotations"
  ON admin_analytics_annotations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND (
          profiles.role = 'admin'
          OR (profiles.roles IS NOT NULL AND 'admin' = ANY (profiles.roles))
        )
    )
  );

CREATE POLICY "Admins can update analytics annotations"
  ON admin_analytics_annotations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND (
          profiles.role = 'admin'
          OR (profiles.roles IS NOT NULL AND 'admin' = ANY (profiles.roles))
        )
    )
  );

CREATE POLICY "Admins can delete analytics annotations"
  ON admin_analytics_annotations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND (
          profiles.role = 'admin'
          OR (profiles.roles IS NOT NULL AND 'admin' = ANY (profiles.roles))
        )
    )
  );
