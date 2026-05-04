-- Migration 144: Admin-controlled geo eligibility (geo_zones) + optional link on market_drops.
-- geo_zones is the source of truth for which geographies may show virtual campaigns / create market_drops.
-- market_countries remains the broad country ↔ market gate (resolve-market.ts).

CREATE TABLE IF NOT EXISTS geo_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_code TEXT NOT NULL REFERENCES markets(code) ON DELETE CASCADE,
  country_code TEXT NOT NULL,
  region_code TEXT,
  city TEXT,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  zone_type TEXT NOT NULL,
  eligibility_status TEXT NOT NULL,
  currency_code TEXT,
  terms_version TEXT,
  requires_admin_approval BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT geo_zones_zone_type_check CHECK (
    zone_type IN ('country', 'region', 'city', 'metro', 'custom')
  ),
  CONSTRAINT geo_zones_eligibility_status_check CHECK (
    eligibility_status IN (
      'disabled',
      'browse_only',
      'interest_only',
      'conditional_reservation',
      'normal_checkout'
    )
  ),
  CONSTRAINT geo_zones_country_code_upper CHECK (
    char_length(country_code) = 2 AND country_code = upper(country_code)
  ),
  CONSTRAINT geo_zones_region_code_upper CHECK (
    region_code IS NULL OR (char_length(region_code) = 2 AND region_code = upper(region_code))
  )
);

COMMENT ON TABLE geo_zones IS
  'Admin-defined geographic slices for campaign/checkout eligibility; more specific than market_countries alone.';

CREATE INDEX IF NOT EXISTS idx_geo_zones_market_code ON geo_zones(market_code);
CREATE INDEX IF NOT EXISTS idx_geo_zones_country_code ON geo_zones(country_code);
CREATE INDEX IF NOT EXISTS idx_geo_zones_region_code ON geo_zones(region_code);
CREATE INDEX IF NOT EXISTS idx_geo_zones_city ON geo_zones(city);
CREATE INDEX IF NOT EXISTS idx_geo_zones_eligibility_status ON geo_zones(eligibility_status);
CREATE INDEX IF NOT EXISTS idx_geo_zones_is_active ON geo_zones(is_active);

-- One active row per market × country × region slice × city slice × zone_type.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_geo_zones_active_slice
  ON geo_zones (
    market_code,
    country_code,
    (COALESCE(region_code, ''::text)),
    (COALESCE(lower(trim(city)), ''::text)),
    zone_type
  )
  WHERE is_active = true;

ALTER TABLE market_drops
  ADD COLUMN IF NOT EXISTS geo_zone_id UUID REFERENCES geo_zones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_market_drops_geo_zone_id
  ON market_drops(geo_zone_id)
  WHERE geo_zone_id IS NOT NULL;

COMMENT ON COLUMN market_drops.geo_zone_id IS
  'Optional link to the geo_zones row that authorized this customer-facing slice.';

-- ---------------------------------------------------------------------------
-- Seeds (minimal; do not seed all US states — add regions via admin/API).
-- ---------------------------------------------------------------------------

-- Sweden country-wide: matches profiles with country SE when city/region do not match a more specific row.
INSERT INTO geo_zones (
  market_code,
  country_code,
  region_code,
  city,
  name,
  display_name,
  zone_type,
  eligibility_status,
  currency_code,
  terms_version,
  requires_admin_approval,
  is_active,
  sort_order,
  metadata
)
SELECT
  'EU',
  'SE',
  NULL,
  NULL,
  'Sweden (country)',
  'Sweden',
  'country',
  'normal_checkout',
  'SEK',
  NULL,
  false,
  true,
  10,
  '{"seed": true}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM geo_zones gz
  WHERE gz.market_code = 'EU'
    AND gz.country_code = 'SE'
    AND gz.region_code IS NULL
    AND gz.city IS NULL
    AND gz.zone_type = 'country'
    AND gz.is_active = true
);

-- Stockholm city (more specific than country-wide when profile.city matches).
INSERT INTO geo_zones (
  market_code,
  country_code,
  region_code,
  city,
  name,
  display_name,
  zone_type,
  eligibility_status,
  currency_code,
  terms_version,
  requires_admin_approval,
  is_active,
  sort_order,
  metadata
)
SELECT
  'EU',
  'SE',
  NULL,
  'Stockholm',
  'Stockholm city',
  'Stockholm, Sweden',
  'city',
  'normal_checkout',
  'SEK',
  NULL,
  false,
  true,
  5,
  '{"seed": true}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM geo_zones gz
  WHERE gz.market_code = 'EU'
    AND gz.country_code = 'SE'
    AND gz.region_code IS NULL
    AND lower(trim(gz.city)) = 'stockholm'
    AND gz.zone_type = 'city'
    AND gz.is_active = true
);

-- US California (conditional) — aligns with seeded market_drop for CA.
INSERT INTO geo_zones (
  market_code,
  country_code,
  region_code,
  city,
  name,
  display_name,
  zone_type,
  eligibility_status,
  currency_code,
  terms_version,
  requires_admin_approval,
  is_active,
  sort_order,
  metadata
)
SELECT
  'US',
  'US',
  'CA',
  NULL,
  'California (region)',
  'California, United States',
  'region',
  'conditional_reservation',
  'SEK',
  'US_CONDITIONAL_RESERVATION_v1',
  true,
  true,
  0,
  '{"seed": true, "kind": "us_ca_conditional"}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM geo_zones gz
  WHERE gz.market_code = 'US'
    AND gz.country_code = 'US'
    AND gz.region_code = 'CA'
    AND gz.city IS NULL
    AND gz.zone_type = 'region'
    AND gz.is_active = true
);

-- US / New York: intentionally NOT seeded as eligible — admins enable via /api/admin/geo-zones.

-- Link existing seeded market_drops to their geo_zones (nullable legacy rows remain valid).
UPDATE market_drops md
SET geo_zone_id = gz.id
FROM geo_zones gz
WHERE md.geo_zone_id IS NULL
  AND md.market_code = 'US'
  AND md.country_code = 'US'
  AND md.region_code = 'CA'
  AND gz.market_code = 'US'
  AND gz.country_code = 'US'
  AND gz.region_code = 'CA'
  AND gz.zone_type = 'region'
  AND gz.is_active = true;

UPDATE market_drops md
SET geo_zone_id = gz.id
FROM geo_zones gz
WHERE md.geo_zone_id IS NULL
  AND md.market_code = 'EU'
  AND md.country_code = 'SE'
  AND md.region_code IS NULL
  AND gz.market_code = 'EU'
  AND gz.country_code = 'SE'
  AND gz.zone_type = 'city'
  AND lower(trim(gz.city)) = 'stockholm'
  AND gz.is_active = true;
