-- Synthetic catalog/zone/market seed for crowdvine-checkout-audit ONLY.
-- No real users/orders. No auth.users rows (created via Admin API script).
-- Fixed UUIDs for deterministic tests.

DO $$
BEGIN
  IF (
    SELECT value FROM checkout_audit_meta WHERE key = 'project_ref'
  ) IS DISTINCT FROM 'msdfjrrokcmjifetuwgc' THEN
    RAISE EXCEPTION 'REFUSED: wrong project_ref for seed';
  END IF;
END $$;

-- EU market + SE checkout-eligible
INSERT INTO markets (
  code, name, default_country_code, currency_code, locale,
  checkout_mode, payment_capture_mode, age_minimum, is_active
) VALUES (
  'EU', 'Europe', 'SE', 'SEK', 'sv',
  'normal_checkout', 'automatic', 20, true
)
ON CONFLICT (code) DO UPDATE SET
  checkout_mode = EXCLUDED.checkout_mode,
  payment_capture_mode = EXCLUDED.payment_capture_mode,
  is_active = true,
  updated_at = now();

INSERT INTO market_countries (id, market_code, country_code, role, is_default)
VALUES (
  '11111111-1111-1111-1111-111111111101',
  'EU', 'SE', 'checkout_eligible', true
)
ON CONFLICT (market_code, country_code) DO UPDATE SET
  role = 'checkout_eligible',
  is_default = true;

-- Stockholm pallet zones
INSERT INTO pallet_zones (id, name, zone_type, center_lat, center_lon, radius_km, country_code)
VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'Synthetic Stockholm Delivery',
    'delivery', 59.3293, 18.0686, 40, 'SE'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    'Synthetic Stockholm Pickup',
    'pickup', 59.3293, 18.0686, 5, 'SE'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  zone_type = EXCLUDED.zone_type,
  country_code = 'SE';

INSERT INTO shipping_regions (id, name, country_code)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb0', 'Synthetic SE Region', 'SE')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO geo_zones (
  id, market_code, country_code, name, display_name, zone_type,
  eligibility_status, currency_code, requires_admin_approval, is_active,
  default_delivery_zone_id, sort_order
) VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  'EU', 'SE', 'Sweden', 'Sverige',
  'country', 'normal_checkout', 'SEK', false, true,
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 0
)
ON CONFLICT (id) DO UPDATE SET
  eligibility_status = 'normal_checkout',
  is_active = true,
  default_delivery_zone_id = EXCLUDED.default_delivery_zone_id;

INSERT INTO producers (id, name, display_name, boost_active, shipping_region_id, is_live)
VALUES (
  'cccccccc-cccc-cccc-cccc-ccccccccccc1',
  'Synthetic Producer A',
  'Synthetic Producer A',
  false,
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb0',
  true
)
ON CONFLICT (id) DO UPDATE SET is_live = true, name = EXCLUDED.name;

INSERT INTO wines (
  id, handle, wine_name, vintage, color, base_price_cents, producer_id,
  cost_amount, cost_currency, exchange_rate, alcohol_tax_cents, price_includes_vat, is_live
) VALUES
  (
    'dddddddd-dddd-dddd-dddd-ddddddddddd1',
    'synthetic-souteronne',
    'Synthetic Souteronne',
    '2022', 'red', 21100,
    'cccccccc-cccc-cccc-cccc-ccccccccccc1',
    8.5, 'EUR', 11.5, 0, true, true
  ),
  (
    'dddddddd-dddd-dddd-dddd-ddddddddddd2',
    'synthetic-resiste',
    'Synthetic Résiste',
    '2023', 'white', 10700,
    'cccccccc-cccc-cccc-cccc-ccccccccccc1',
    5.0, 'EUR', 11.5, 0, true, true
  )
ON CONFLICT (id) DO UPDATE SET
  base_price_cents = EXCLUDED.base_price_cents,
  is_live = true;

-- PI path requires direct-charge pallet status
INSERT INTO pallets (
  id, name, delivery_zone_id, pickup_zone_id, shipping_region_id,
  cost_cents, last_mile_cost_cents_per_bottle, bottle_capacity,
  min_bottles_to_complete, status, status_mode
) VALUES (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1',
  'Synthetic Stockholm Audit Pallet',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb0',
  500000, 0, 300, 6, 'shipping_ordered', 'auto'
)
ON CONFLICT (id) DO UPDATE SET
  status = 'shipping_ordered',
  delivery_zone_id = EXCLUDED.delivery_zone_id,
  pickup_zone_id = EXCLUDED.pickup_zone_id;

INSERT INTO market_drops (
  id, source_pallet_id, market_code, country_code, display_name,
  display_destination, checkout_mode, currency_code, status, geo_zone_id
) VALUES (
  'ffffffff-ffff-ffff-ffff-fffffffffff1',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1',
  'EU', 'SE', 'Synthetic Stockholm Drop',
  'Stockholm', 'normal_checkout', 'SEK', 'active',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'
)
ON CONFLICT (id) DO UPDATE SET status = 'active';

-- pact channel only (DIRECT_BOX OFF — no direct_box rate invention)
DELETE FROM customer_shipping_rates WHERE channel = 'direct_box';
INSERT INTO customer_shipping_rates (
  id, channel, country_code, flat_fee_cents, free_shipping, active, notes
) VALUES (
  '99999999-9999-9999-9999-999999999901',
  'pact', 'SE', 9900, false, true,
  'synthetic audit flat 99 SEK'
)
ON CONFLICT (id) DO UPDATE SET
  flat_fee_cents = 9900,
  active = true,
  channel = 'pact';

INSERT INTO checkout_audit_meta (key, value) VALUES
  ('seed_catalog_at', now()::text),
  ('seed_pallet_id', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1'),
  ('seed_geo_zone_id', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'),
  ('seed_wine_handles', 'synthetic-souteronne,synthetic-resiste'),
  ('seed_bottles_target', '8')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
