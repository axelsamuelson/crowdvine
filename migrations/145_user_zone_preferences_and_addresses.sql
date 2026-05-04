-- Migration 145: Active shopping zone (user_zone_preferences) + per-zone saved addresses (user_zone_addresses).
-- Phase 1: schema + RLS. Checkout/invite integration comes in later phases.

CREATE TABLE IF NOT EXISTS user_zone_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  active_geo_zone_id UUID REFERENCES geo_zones(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_zone_preferences_user_id_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_zone_preferences_active_geo_zone_id
  ON user_zone_preferences(active_geo_zone_id)
  WHERE active_geo_zone_id IS NOT NULL;

COMMENT ON TABLE user_zone_preferences IS
  'One row per user: persisted active shopping geo (geo_zones), separate from profile home address.';

CREATE TABLE IF NOT EXISTS user_zone_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  geo_zone_id UUID NOT NULL REFERENCES geo_zones(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  postal_code TEXT,
  country_code TEXT NOT NULL,
  region_code TEXT,
  is_default_for_zone BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_zone_addresses_user_geo_unique UNIQUE (user_id, geo_zone_id),
  CONSTRAINT user_zone_addresses_country_upper CHECK (
    char_length(country_code) = 2 AND country_code = upper(country_code)
  ),
  CONSTRAINT user_zone_addresses_region_upper CHECK (
    region_code IS NULL OR (char_length(region_code) = 2 AND region_code = upper(region_code))
  )
);

CREATE INDEX IF NOT EXISTS idx_user_zone_addresses_user_id ON user_zone_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_zone_addresses_geo_zone_id ON user_zone_addresses(geo_zone_id);

COMMENT ON TABLE user_zone_addresses IS
  'Saved delivery/contact template per user per geo_zones slice; order snapshots remain on user_addresses.';

-- ---------------------------------------------------------------------------
-- RLS (direct Supabase client with user JWT). Service role bypasses RLS.
-- ---------------------------------------------------------------------------

ALTER TABLE user_zone_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_zone_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_zone_preferences_select_own
  ON user_zone_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY user_zone_preferences_insert_own
  ON user_zone_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_zone_preferences_update_own
  ON user_zone_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_zone_preferences_delete_own
  ON user_zone_preferences FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY user_zone_addresses_select_own
  ON user_zone_addresses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY user_zone_addresses_insert_own
  ON user_zone_addresses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_zone_addresses_update_own
  ON user_zone_addresses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_zone_addresses_delete_own
  ON user_zone_addresses FOR DELETE
  USING (auth.uid() = user_id);
