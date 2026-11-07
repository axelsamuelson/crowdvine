-- Disposable LOCAL audit schema ONLY (crowdvine_checkout_audit @ 127.0.0.1).
-- Mirrors the subset of production migrations needed for OFF-path concurrency /
-- idempotency / CAS proofs (138 unique PI, 277 channel+dispatch, shipping rates).
-- NOT a full prod dump. NEVER apply against abrnvjqwpdkodgrtezeg or shared DBs.
-- Synthetic columns only — no production customer/order copies.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_shipping_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('pact', 'direct_box')),
  flat_fee_sek NUMERIC NOT NULL,
  free_shipping_threshold_sek NUMERIC,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (country_code, channel)
);

CREATE TABLE IF NOT EXISTS synthetic_wines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  producer_name TEXT NOT NULL,
  price_sek NUMERIC NOT NULL,
  bottles_per_case INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS synthetic_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_profile_id UUID REFERENCES profiles(id),
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS synthetic_cart_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES synthetic_carts(id) ON DELETE CASCADE,
  wine_id UUID NOT NULL REFERENCES synthetic_wines(id),
  quantity INT NOT NULL CHECK (quantity > 0)
);

-- Minimal order_reservations surface for PI unique-at-insert + dispatch CAS.
CREATE TABLE IF NOT EXISTS order_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending_payment',
  payment_status TEXT,
  payment_intent_id TEXT,
  setup_intent_id TEXT,
  user_id UUID REFERENCES profiles(id),
  cart_id TEXT,
  pallet_id UUID,
  fulfillment_channel TEXT
    CHECK (
      fulfillment_channel IS NULL
      OR fulfillment_channel IN ('shared_pallet', 'direct_box')
    ),
  fulfillment_dispatch_status TEXT
    CHECK (
      fulfillment_dispatch_status IS NULL
      OR fulfillment_dispatch_status IN (
        'pending_manual_handoff',
        'booked',
        'skipped',
        'cancelled',
        'completed',
        'pending'
      )
    ),
  charge_blocked_reason TEXT,
  country_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migration 138 equivalent (partial unique indexes).
CREATE UNIQUE INDEX IF NOT EXISTS idx_order_reservations_payment_intent_id_unique
  ON order_reservations(payment_intent_id)
  WHERE payment_intent_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_order_reservations_setup_intent_id_unique
  ON order_reservations(setup_intent_id)
  WHERE setup_intent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_reservations_fulfillment_channel
  ON order_reservations (fulfillment_channel)
  WHERE fulfillment_channel IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_reservations_fulfillment_dispatch_status
  ON order_reservations (fulfillment_dispatch_status)
  WHERE fulfillment_dispatch_status IS NOT NULL;

-- Audit marker table so tests can prove which DB they hit.
CREATE TABLE IF NOT EXISTS checkout_audit_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO checkout_audit_meta (key, value)
VALUES
  ('isolation', 'local_loopback_only'),
  ('prod_ref_forbidden', 'abrnvjqwpdkodgrtezeg'),
  ('direct_box_global', 'OFF'),
  ('dataset', 'synthetic_only')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
