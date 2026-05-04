-- Migration 142: market_drops (customer-facing) + order_reservations.market_drop_id
-- Phase 1 schema + seed only — no application behavior changes.
-- Date: 2026-04-28
--
-- capacity_bottles = 720 on both seeds: mirrors internal pallet bottle_capacity so a future
-- UI can show the same denominator as logistics; Phase 3 may sync from pallets or maintain here.

CREATE TABLE IF NOT EXISTS market_drops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_pallet_id UUID NOT NULL REFERENCES pallets(id) ON DELETE CASCADE,
  market_code TEXT NOT NULL REFERENCES markets(code),
  country_code TEXT NOT NULL,
  region_code TEXT,
  display_name TEXT NOT NULL,
  display_destination TEXT NOT NULL,
  checkout_mode TEXT NOT NULL,
  currency_code TEXT NOT NULL,
  status TEXT NOT NULL,
  charge_policy TEXT NOT NULL,
  capacity_bottles INTEGER,
  reserved_bottles INTEGER NOT NULL DEFAULT 0,
  conditional_bottles INTEGER NOT NULL DEFAULT 0,
  terms_version TEXT,
  logistics_status TEXT,
  legal_status TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT market_drops_checkout_mode_check CHECK (
    checkout_mode IN (
      'disabled',
      'interest_only',
      'conditional_reservation',
      'normal_checkout'
    )
  ),
  CONSTRAINT market_drops_status_check CHECK (
    status IN ('draft', 'active', 'conditional', 'paused', 'closed')
  ),
  CONSTRAINT market_drops_charge_policy_check CHECK (
    charge_policy IN ('automatic_allowed', 'admin_approved_required', 'disabled')
  ),
  CONSTRAINT market_drops_country_code_upper CHECK (
    char_length(country_code) = 2 AND country_code = upper(country_code)
  ),
  CONSTRAINT market_drops_region_code_upper CHECK (
    region_code IS NULL OR (char_length(region_code) = 2 AND region_code = upper(region_code))
  )
);

COMMENT ON TABLE market_drops IS
  'Customer-facing market availability / demand slice linked to one internal logistics pallet (source_pallet_id).';

CREATE INDEX IF NOT EXISTS idx_market_drops_source_pallet_id
  ON market_drops(source_pallet_id);

CREATE INDEX IF NOT EXISTS idx_market_drops_market_code
  ON market_drops(market_code);

CREATE INDEX IF NOT EXISTS idx_market_drops_country_code
  ON market_drops(country_code);

CREATE INDEX IF NOT EXISTS idx_market_drops_region_code
  ON market_drops(region_code);

CREATE INDEX IF NOT EXISTS idx_market_drops_status
  ON market_drops(status);

CREATE INDEX IF NOT EXISTS idx_market_drops_charge_policy
  ON market_drops(charge_policy);

-- One non-closed slice per source pallet × market × country × region (empty = null) × checkout_mode.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_market_drops_open_customer_slice
  ON market_drops (
    source_pallet_id,
    market_code,
    country_code,
    (COALESCE(region_code, ''::text)),
    checkout_mode
  )
  WHERE status IN ('active', 'conditional', 'paused');

-- ---------------------------------------------------------------------------
-- order_reservations: optional link to customer-facing drop (nullable).
-- ON DELETE SET NULL so removing a drop does not delete reservations.
-- ---------------------------------------------------------------------------
ALTER TABLE order_reservations
  ADD COLUMN IF NOT EXISTS market_drop_id UUID REFERENCES market_drops(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_order_reservations_market_drop_id
  ON order_reservations(market_drop_id)
  WHERE market_drop_id IS NOT NULL;

COMMENT ON COLUMN order_reservations.market_drop_id IS
  'Customer-facing market drop; internal logistics remain on pallet_id.';

-- ---------------------------------------------------------------------------
-- Seed (only when source pallet exists — avoids failing fresh DBs).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  src UUID := '3985cbfe-178f-4fa1-a897-17183a1f18db';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pallets WHERE id = src) THEN
    RAISE NOTICE 'migration 142: pallet % not found — skipping market_drops seed', src;
  ELSE
  INSERT INTO market_drops (
    source_pallet_id,
    market_code,
    country_code,
    region_code,
    display_name,
    display_destination,
    checkout_mode,
    currency_code,
    status,
    charge_policy,
    capacity_bottles,
    reserved_bottles,
    conditional_bottles,
    terms_version,
    logistics_status,
    legal_status,
    metadata
  )
  SELECT
    src,
    'EU',
    'SE',
    NULL,
    'Middle Languedoc to Stockholm',
    'Stockholm, Sweden',
    'normal_checkout',
    'SEK',
    'active',
    'automatic_allowed',
    720,
    0,
    0,
    NULL,
    'active',
    'approved',
    '{"seed": true, "kind": "eu_mirror"}'::jsonb
  WHERE NOT EXISTS (
    SELECT 1 FROM market_drops md
    WHERE md.source_pallet_id = src
      AND md.market_code = 'EU'
      AND md.country_code = 'SE'
      AND md.region_code IS NULL
      AND md.checkout_mode = 'normal_checkout'
      AND md.status IN ('active', 'conditional', 'paused')
  );

  INSERT INTO market_drops (
    source_pallet_id,
    market_code,
    country_code,
    region_code,
    display_name,
    display_destination,
    checkout_mode,
    currency_code,
    status,
    charge_policy,
    capacity_bottles,
    reserved_bottles,
    conditional_bottles,
    terms_version,
    logistics_status,
    legal_status,
    metadata
  )
  SELECT
    src,
    'US',
    'US',
    'CA',
    'Middle Languedoc · California Conditional Drop',
    'California, United States',
    'conditional_reservation',
    'SEK',
    'conditional',
    'admin_approved_required',
    720,
    0,
    0,
    'US_CONDITIONAL_RESERVATION_v1',
    'pending',
    'review_required',
    jsonb_build_object(
      'seed', true,
      'kind', 'us_conditional',
      'note',
      'Customer-facing conditional drop linked to internal source pallet. Not approved for charge or fulfillment.'
    )
  WHERE NOT EXISTS (
    SELECT 1 FROM market_drops md
    WHERE md.source_pallet_id = src
      AND md.market_code = 'US'
      AND md.country_code = 'US'
      AND md.region_code = 'CA'
      AND md.checkout_mode = 'conditional_reservation'
      AND md.status IN ('active', 'conditional', 'paused')
  );
  END IF;
END $$;
