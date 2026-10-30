-- UTM link builder: store reusable campaign links for consistent attribution.

CREATE TABLE IF NOT EXISTS analytics_campaign_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_path TEXT NOT NULL,
  utm_source TEXT NOT NULL,
  utm_medium TEXT NOT NULL,
  utm_campaign TEXT NOT NULL,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_analytics_campaign_links_created_at
  ON analytics_campaign_links (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_campaign_links_campaign
  ON analytics_campaign_links (utm_campaign);

COMMENT ON TABLE analytics_campaign_links IS
  'Admin UTM link builder — normalised source/medium/campaign for reusable tracked URLs.';

ALTER TABLE analytics_campaign_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can select analytics campaign links"
  ON analytics_campaign_links;
DROP POLICY IF EXISTS "Admins can insert analytics campaign links"
  ON analytics_campaign_links;
DROP POLICY IF EXISTS "Admins can update analytics campaign links"
  ON analytics_campaign_links;
DROP POLICY IF EXISTS "Admins can delete analytics campaign links"
  ON analytics_campaign_links;

CREATE POLICY "Admins can select analytics campaign links"
  ON analytics_campaign_links
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

CREATE POLICY "Admins can insert analytics campaign links"
  ON analytics_campaign_links
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

CREATE POLICY "Admins can update analytics campaign links"
  ON analytics_campaign_links
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

CREATE POLICY "Admins can delete analytics campaign links"
  ON analytics_campaign_links
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
