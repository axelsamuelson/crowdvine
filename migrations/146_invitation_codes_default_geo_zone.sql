-- Optional: suggest a default wine zone on invite validate (UI may preselect).
ALTER TABLE invitation_codes
  ADD COLUMN IF NOT EXISTS default_geo_zone_id UUID REFERENCES geo_zones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invitation_codes_default_geo_zone_id
  ON invitation_codes(default_geo_zone_id)
  WHERE default_geo_zone_id IS NOT NULL;

COMMENT ON COLUMN invitation_codes.default_geo_zone_id IS
  'Optional geo_zones row to preselect on invite signup; user must still confirm.';
