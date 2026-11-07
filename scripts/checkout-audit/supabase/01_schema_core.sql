-- crowdvine-checkout-audit ONLY (ref msdfjrrokcmjifetuwgc).
-- Idempotent minimal schema for shared_pallet B2C checkout (DIRECT_BOX OFF).
-- NOT a production dump. NEVER apply to abrnvjqwpdkodgrtezeg.
-- Synthetic columns/rows only.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS checkout_audit_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO checkout_audit_meta (key, value) VALUES
  ('project_ref', 'msdfjrrokcmjifetuwgc'),
  ('project_name', 'crowdvine-checkout-audit'),
  ('isolation', 'authorized_isolated_supabase'),
  ('prod_ref_forbidden', 'abrnvjqwpdkodgrtezeg'),
  ('direct_box_global', 'OFF'),
  ('dataset', 'synthetic_only')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- Fail closed if somehow pointed at wrong DB (defense in depth for SQL runners).
DO $$
DECLARE
  v TEXT;
BEGIN
  SELECT value INTO v FROM checkout_audit_meta WHERE key = 'project_ref';
  IF v IS DISTINCT FROM 'msdfjrrokcmjifetuwgc' THEN
    RAISE EXCEPTION 'REFUSED: checkout_audit_meta.project_ref=% (expected msdfjrrokcmjifetuwgc)', v;
  END IF;
END $$;

-- Profiles (FK to auth.users; rows created after Admin API auth user)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  roles TEXT[] NOT NULL DEFAULT '{}',
  portal_access TEXT[] DEFAULT NULL,
  producer_id UUID,
  stripe_customer_id TEXT,
  date_of_birth DATE,
  country TEXT,
  region TEXT,
  city TEXT,
  postal_code TEXT,
  access_granted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS markets (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  default_country_code TEXT,
  currency_code TEXT NOT NULL DEFAULT 'SEK',
  locale TEXT NOT NULL DEFAULT 'en',
  checkout_mode TEXT NOT NULL,
  payment_capture_mode TEXT NOT NULL,
  age_minimum INTEGER,
  terms_version TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT markets_checkout_mode_check CHECK (
    checkout_mode IN (
      'disabled', 'interest_only', 'conditional_reservation', 'normal_checkout'
    )
  ),
  CONSTRAINT markets_payment_capture_mode_check CHECK (
    payment_capture_mode IN ('manual', 'automatic', 'admin_approved')
  )
);

CREATE TABLE IF NOT EXISTS market_countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_code TEXT NOT NULL REFERENCES markets(code) ON DELETE CASCADE,
  country_code TEXT NOT NULL,
  role TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT market_countries_role_check CHECK (
    role IN ('browse_only', 'checkout_eligible', 'conditional_eligible', 'blocked')
  ),
  CONSTRAINT market_countries_unique_market_country UNIQUE (market_code, country_code)
);

CREATE TABLE IF NOT EXISTS pallet_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  zone_type TEXT NOT NULL CHECK (zone_type IN ('delivery', 'pickup')),
  center_lat DOUBLE PRECISION,
  center_lon DOUBLE PRECISION,
  radius_km DOUBLE PRECISION,
  country_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
  requires_admin_approval BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  default_delivery_zone_id UUID REFERENCES pallet_zones(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_zone_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  active_geo_zone_id UUID REFERENCES geo_zones(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_zone_preferences_user_id_unique UNIQUE (user_id)
);

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
  CONSTRAINT user_zone_addresses_user_geo_unique UNIQUE (user_id, geo_zone_id)
);

CREATE TABLE IF NOT EXISTS shipping_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS producers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  display_name TEXT,
  boost_active BOOLEAN NOT NULL DEFAULT false,
  shipping_region_id UUID REFERENCES shipping_regions(id) ON DELETE SET NULL,
  is_pallet_zone BOOLEAN DEFAULT false,
  is_live BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle TEXT UNIQUE NOT NULL,
  wine_name TEXT NOT NULL,
  vintage TEXT NOT NULL DEFAULT 'NV',
  grape_varieties TEXT,
  color TEXT,
  label_image_path TEXT,
  base_price_cents INTEGER NOT NULL,
  producer_id UUID NOT NULL REFERENCES producers(id),
  cost_amount NUMERIC,
  cost_currency TEXT,
  exchange_rate NUMERIC,
  alcohol_tax_cents INTEGER,
  price_includes_vat BOOLEAN DEFAULT true,
  is_live BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  delivery_zone_id UUID REFERENCES pallet_zones(id),
  pickup_zone_id UUID REFERENCES pallet_zones(id),
  shipping_region_id UUID REFERENCES shipping_regions(id),
  cost_cents INTEGER NOT NULL DEFAULT 0,
  last_mile_cost_cents_per_bottle INTEGER DEFAULT 0,
  bottle_capacity INTEGER NOT NULL DEFAULT 300,
  min_bottles_to_complete INTEGER DEFAULT 0,
  -- shipping_ordered forces PaymentIntent path (not deferred SetupIntent)
  status TEXT NOT NULL DEFAULT 'shipping_ordered',
  status_mode TEXT NOT NULL DEFAULT 'auto',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS market_drops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_pallet_id UUID REFERENCES pallets(id) ON DELETE SET NULL,
  market_code TEXT REFERENCES markets(code),
  country_code TEXT,
  display_name TEXT,
  display_destination TEXT,
  checkout_mode TEXT,
  currency_code TEXT DEFAULT 'SEK',
  status TEXT NOT NULL DEFAULT 'active',
  charge_policy TEXT,
  geo_zone_id UUID REFERENCES geo_zones(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_shipping_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL DEFAULT 'pact',
  country_code CHAR(2),
  flat_fee_cents INTEGER NOT NULL DEFAULT 0 CHECK (flat_fee_cents >= 0),
  free_shipping BOOLEAN NOT NULL DEFAULT FALSE,
  free_shipping_threshold_cents INTEGER,
  min_bottles INTEGER,
  max_bottles INTEGER,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT customer_shipping_rates_channel_check
    CHECK (channel IN ('pact', 'direct_box'))
);

CREATE TABLE IF NOT EXISTS carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  wine_id UUID NOT NULL REFERENCES wines(id),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  source TEXT NOT NULL DEFAULT 'producer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS cart_items_cart_id_wine_id_source_unique
  ON cart_items(cart_id, wine_id, source);

CREATE TABLE IF NOT EXISTS user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  address_street TEXT,
  address_postcode TEXT,
  address_city TEXT,
  country_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  cart_id TEXT,
  address_id UUID REFERENCES user_addresses(id),
  pickup_zone_id UUID REFERENCES pallet_zones(id),
  delivery_zone_id UUID REFERENCES pallet_zones(id),
  pallet_id UUID REFERENCES pallets(id),
  shipping_region_id UUID REFERENCES shipping_regions(id),
  producer_id UUID REFERENCES producers(id),
  checkout_group_id UUID,
  market_drop_id UUID REFERENCES market_drops(id),
  discount_code_id UUID,
  discount_amount_sek NUMERIC,
  total_sek NUMERIC,
  shipping_revenue_gross_cents INTEGER,
  bottles INTEGER,
  is_test_purchase BOOLEAN NOT NULL DEFAULT true,
  idempotency_key TEXT,
  status TEXT NOT NULL DEFAULT 'pending_payment',
  payment_status TEXT,
  payment_intent_id TEXT,
  setup_intent_id TEXT,
  payment_method_id TEXT,
  payment_mode TEXT,
  payment_method_type TEXT,
  payment_method_brand TEXT,
  payment_method_last4 TEXT,
  charge_id TEXT,
  fulfillment_channel TEXT
    CHECK (
      fulfillment_channel IS NULL
      OR fulfillment_channel IN ('shared_pallet', 'direct_box')
    ),
  fulfillment_dispatch_status TEXT,
  charge_blocked_reason TEXT,
  country_code TEXT,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_order_reservations_payment_intent_id_unique
  ON order_reservations(payment_intent_id)
  WHERE payment_intent_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_order_reservations_setup_intent_id_unique
  ON order_reservations(setup_intent_id)
  WHERE setup_intent_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS order_reservation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES order_reservations(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES wines(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price_band TEXT,
  economics_snapshot JSONB,
  pre_pallet_contribution_cents INTEGER,
  outbound_freight_quote_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
