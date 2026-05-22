-- Link shopper geo_zones to pallet delivery zones (shared display name).
-- Wine zones must have a city; country-only rows are disabled for customer pickers.

ALTER TABLE geo_zones
  ADD COLUMN IF NOT EXISTS default_delivery_zone_id UUID
  REFERENCES pallet_zones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_geo_zones_default_delivery_zone_id
  ON geo_zones(default_delivery_zone_id)
  WHERE default_delivery_zone_id IS NOT NULL;

COMMENT ON COLUMN geo_zones.default_delivery_zone_id IS
  'Pallet delivery zone used at checkout when geocoding; name should match display_name.';

-- Country-wide / no-city rows are not valid shopper wine zones.
UPDATE geo_zones
SET
  is_active = false,
  eligibility_status = 'disabled',
  updated_at = now()
WHERE city IS NULL OR trim(city) = '';

-- US region rows: use region as city label for dropdown + matching.
UPDATE geo_zones
SET
  city = trim(region_code),
  zone_type = 'city',
  updated_at = now()
WHERE country_code = 'US'
  AND region_code IS NOT NULL
  AND (city IS NULL OR trim(city) = '')
  AND is_active = true;

-- Best-effort link: delivery pallet zone name matches geo display_name or contains city.
UPDATE geo_zones gz
SET default_delivery_zone_id = pz.id,
    updated_at = now()
FROM pallet_zones pz
WHERE gz.is_active = true
  AND gz.default_delivery_zone_id IS NULL
  AND trim(coalesce(gz.city, '')) <> ''
  AND pz.zone_type = 'delivery'
  AND (
    lower(trim(pz.name)) = lower(trim(gz.display_name))
    OR lower(trim(pz.name)) LIKE '%' || lower(trim(gz.city)) || '%'
  );
