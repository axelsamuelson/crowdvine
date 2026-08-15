-- Migration 197: Outbound freight / Instabee (Budbee Light) economics (Phase 2C).
-- Reuses logistics catalogue with direction=OUTBOUND. Does NOT change live 120-bottle readiness.
-- Date: 2026-08-15

-- ---------------------------------------------------------------------------
-- 1. Extend freight_rates for incremental volumetric / per-parcel pricing
-- ---------------------------------------------------------------------------
ALTER TABLE freight_rates
  ADD COLUMN IF NOT EXISTS pricing_basis TEXT,
  ADD COLUMN IF NOT EXISTS included_weight_kg NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS weight_increment_kg NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS increment_price_amount NUMERIC(14, 4),
  ADD COLUMN IF NOT EXISTS volumetric_factor NUMERIC(12, 4);

COMMENT ON COLUMN freight_rates.pricing_basis IS
  'ACTUAL_WEIGHT | VOLUMETRIC_WEIGHT | MAX_ACTUAL_OR_VOLUMETRIC | FIXED_PER_PARCEL. Null = legacy inbound rates.';

COMMENT ON COLUMN freight_rates.included_weight_kg IS
  'Weight (kg) included in base_price_amount for incremental weight rates.';

COMMENT ON COLUMN freight_rates.weight_increment_kg IS
  'Increment step size in kg (e.g. 0.5 for Budbee Light).';

COMMENT ON COLUMN freight_rates.increment_price_amount IS
  'Major-currency price per weight_increment_kg beyond included_weight_kg.';

COMMENT ON COLUMN freight_rates.volumetric_factor IS
  'kg/m3 factor for volumetric weight (Instabee: 280).';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'freight_rates_pricing_basis_chk'
  ) THEN
    ALTER TABLE freight_rates
      ADD CONSTRAINT freight_rates_pricing_basis_chk
      CHECK (
        pricing_basis IS NULL
        OR pricing_basis IN (
          'ACTUAL_WEIGHT',
          'VOLUMETRIC_WEIGHT',
          'MAX_ACTUAL_OR_VOLUMETRIC',
          'FIXED_PER_PARCEL'
        )
      );
  END IF;
END $$;

-- Allow PER_PARCEL / PER_PICKUP on components (outbound surcharges)
ALTER TABLE freight_rate_components
  DROP CONSTRAINT IF EXISTS freight_rate_components_calculation_type_check;

ALTER TABLE freight_rate_components
  ADD CONSTRAINT freight_rate_components_calculation_type_check
  CHECK (calculation_type IN (
    'FIXED',
    'PER_PALLET',
    'PER_KG',
    'PER_PARCEL',
    'PER_PICKUP',
    'PERCENT_OF_BASE',
    'PERCENT_OF_SUBTOTAL',
    'SPOT_QUOTE'
  ));

-- Expand rate unit_type for outbound parcels
ALTER TABLE freight_rates
  DROP CONSTRAINT IF EXISTS freight_rates_unit_type_check;

ALTER TABLE freight_rates
  ADD CONSTRAINT freight_rates_unit_type_check
  CHECK (unit_type IN (
    'FIXED',
    'PER_PALLET',
    'PER_KG',
    'PER_PARCEL',
    'SPOT_QUOTE'
  ));

ALTER TABLE freight_rates
  DROP CONSTRAINT IF EXISTS freight_rates_pricing_type_check;

ALTER TABLE freight_rates
  ADD CONSTRAINT freight_rates_pricing_type_check
  CHECK (pricing_type IN (
    'FIXED',
    'PER_PALLET',
    'PER_KG',
    'PER_PARCEL',
    'INCREMENTAL_WEIGHT',
    'SPOT_QUOTE'
  ));

-- ---------------------------------------------------------------------------
-- 2. packaging_profiles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS packaging_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  length_m NUMERIC(12, 6),
  width_m NUMERIC(12, 6),
  height_m NUMERIC(12, 6),
  tare_weight_kg NUMERIC(12, 4),
  max_bottles INTEGER,
  min_bottles INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT packaging_profiles_code_unique UNIQUE (code)
);

COMMENT ON TABLE packaging_profiles IS
  'Outbound packaging profiles. Dimensions/tare must be configured — never invent wine-box sizes.';

-- ---------------------------------------------------------------------------
-- 3. outbound_freight_quotes (checkout/order-level frozen carrier cost)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS outbound_freight_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_group_id UUID,
  idempotency_key TEXT,
  provider_id UUID REFERENCES logistics_providers(id) ON DELETE SET NULL,
  freight_service_id UUID REFERENCES freight_services(id) ON DELETE SET NULL,
  freight_rate_id UUID REFERENCES freight_rates(id) ON DELETE SET NULL,
  packaging_profile_id UUID REFERENCES packaging_profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'ESTIMATED'
    CHECK (status IN (
      'DRAFT',
      'ESTIMATED',
      'FINALIZED',
      'ADJUSTED',
      'INCOMPLETE',
      'EXPIRED'
    )),
  destination_country TEXT,
  destination_postal_code TEXT,
  destination_zone TEXT,
  parcel_count INTEGER,
  bottle_count INTEGER,
  actual_weight_kg NUMERIC(12, 4),
  volumetric_weight_kg NUMERIC(12, 6),
  rounded_volumetric_weight_kg NUMERIC(12, 4),
  chargeable_weight_kg NUMERIC(12, 4),
  weight_basis TEXT,
  currency TEXT NOT NULL DEFAULT 'SEK',
  base_amount_minor INTEGER,
  weight_increment_amount_minor INTEGER,
  component_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  quote_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  estimated_total_minor INTEGER,
  adjustments_total_minor INTEGER NOT NULL DEFAULT 0,
  actual_total_minor INTEGER,
  quoted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ,
  can_calculate BOOLEAN NOT NULL DEFAULT false,
  economically_usable BOOLEAN NOT NULL DEFAULT false,
  incomplete_reasons TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_outbound_freight_quotes_idempotency
  ON outbound_freight_quotes (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_outbound_freight_quotes_checkout_group
  ON outbound_freight_quotes (checkout_group_id)
  WHERE checkout_group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_outbound_freight_quotes_quoted_at
  ON outbound_freight_quotes (quoted_at DESC);

COMMENT ON TABLE outbound_freight_quotes IS
  'Frozen outbound (last-mile) carrier cost per checkout. Separate from customer shipping revenue.';

-- ---------------------------------------------------------------------------
-- 4. outbound_freight_adjustments (post-order actuals)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS outbound_freight_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outbound_freight_quote_id UUID NOT NULL
    REFERENCES outbound_freight_quotes(id) ON DELETE CASCADE,
  component_code TEXT,
  description TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SEK',
  source TEXT,
  occurred_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outbound_freight_adjustments_quote
  ON outbound_freight_adjustments (outbound_freight_quote_id);

COMMENT ON TABLE outbound_freight_adjustments IS
  'Post-order outbound cost adjustments (manual handling, recall, etc.) without rewriting the estimate.';

-- ---------------------------------------------------------------------------
-- 5. Link reservation items optionally to outbound quote (audit)
-- ---------------------------------------------------------------------------
ALTER TABLE order_reservation_items
  ADD COLUMN IF NOT EXISTS outbound_freight_quote_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'order_reservation_items_outbound_freight_quote_id_fkey'
  ) THEN
    ALTER TABLE order_reservation_items
      ADD CONSTRAINT order_reservation_items_outbound_freight_quote_id_fkey
      FOREIGN KEY (outbound_freight_quote_id)
      REFERENCES outbound_freight_quotes(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 6. updated_at + RLS
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_packaging_profiles_updated_at ON packaging_profiles;
CREATE TRIGGER trg_packaging_profiles_updated_at
  BEFORE UPDATE ON packaging_profiles
  FOR EACH ROW EXECUTE FUNCTION set_freight_updated_at();

DROP TRIGGER IF EXISTS trg_outbound_freight_quotes_updated_at ON outbound_freight_quotes;
CREATE TRIGGER trg_outbound_freight_quotes_updated_at
  BEFORE UPDATE ON outbound_freight_quotes
  FOR EACH ROW EXECUTE FUNCTION set_freight_updated_at();

ALTER TABLE packaging_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbound_freight_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbound_freight_adjustments ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 7. Seed packaging profile (dimensions intentionally NULL)
-- ---------------------------------------------------------------------------
INSERT INTO packaging_profiles (
  id, code, name, active,
  length_m, width_m, height_m, tare_weight_kg,
  max_bottles, min_bottles, notes
) VALUES (
  'b1000000-0000-4000-8000-000000000010',
  'WINE_BOX_6',
  '6 bottle wine box',
  true,
  NULL, NULL, NULL, NULL,
  6, 1,
  'Placeholder profile. Configure L×W×H and tare before volumetric Instabee pricing can calculate. Do not invent dimensions.'
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 8. Seed Instabee / Budbee Light Sweden
-- ---------------------------------------------------------------------------
INSERT INTO logistics_providers (id, name, code, default_currency, active, notes)
VALUES (
  'b1000000-0000-4000-8000-000000000001',
  'Instabee',
  'INSTABEE',
  'SEK',
  true,
  'Outbound home delivery (Budbee brand). Commercial rates from Instabee price list.'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO freight_services (
  id, provider_id, name, direction,
  origin_country, destination_country, destination_description,
  transport_mode, pricing_type, active, notes
) VALUES (
  'b1000000-0000-4000-8000-000000000002',
  'b1000000-0000-4000-8000-000000000001',
  'Budbee Light Home Delivery – Sweden',
  'OUTBOUND',
  'SE', 'SE', 'Sweden',
  'ROAD', 'RATE_CARD', true,
  'Home delivery prices incl. fuel and cross border (Budbee Light). Fuel already included — do not add fuel surcharge.'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO freight_rates (
  id, freight_service_id,
  base_price_amount, currency, unit_type, pricing_type,
  pricing_basis, included_weight_kg, weight_increment_kg, increment_price_amount,
  volumetric_factor, valid_to, active, notes
) VALUES (
  'b1000000-0000-4000-8000-000000000003',
  'b1000000-0000-4000-8000-000000000002',
  79, 'SEK', 'PER_PARCEL', 'INCREMENTAL_WEIGHT',
  'VOLUMETRIC_WEIGHT', 0.5, 0.5, 1,
  280, '2026-08-18', true,
  'Budbee Light: 79 SEK first 0.5 volumetric kg + 1 SEK per additional 0.5 kg. Offer valid to 2026-08-18.'
)
ON CONFLICT (id) DO NOTHING;

-- Catalogue surcharges (most event-based / not auto-applied at checkout)
INSERT INTO freight_rate_components (
  id, freight_rate_id, name, code, component_kind, calculation_type,
  value, currency, is_mandatory, is_optional, valid_to, sort_order, notes
) VALUES
(
  'b1000000-0000-4000-8000-000000000021',
  'b1000000-0000-4000-8000-000000000003',
  'Pickup fee', 'PICKUP_FEE', 'FEE', 'PER_PICKUP',
  0, 'SEK', false, true, '2026-08-18', 10,
  '0 SEK per pickup — not economically material.'
),
(
  'b1000000-0000-4000-8000-000000000022',
  'b1000000-0000-4000-8000-000000000003',
  'Exceeds maximum dimensions', 'EXCEEDS_MAX_DIMENSIONS', 'SURCHARGE', 'PER_PARCEL',
  249, 'SEK', false, true, '2026-08-18', 20,
  'Do NOT auto-apply to Home Delivery — Home max dimensions unknown (locker dims are separate).'
),
(
  'b1000000-0000-4000-8000-000000000023',
  'b1000000-0000-4000-8000-000000000003',
  'Manual handling of parcel', 'MANUAL_HANDLING', 'SURCHARGE', 'PER_PARCEL',
  99, 'SEK', false, true, '2026-08-18', 30,
  'Event/conditional — not in initial checkout estimate unless explicitly selected.'
),
(
  'b1000000-0000-4000-8000-000000000024',
  'b1000000-0000-4000-8000-000000000003',
  'Undeliverable parcel / not picked up', 'UNDELIVERABLE', 'SURCHARGE', 'PER_PARCEL',
  49, 'SEK', false, true, '2026-08-18', 40,
  'Post-order event — use outbound_freight_adjustments.'
),
(
  'b1000000-0000-4000-8000-000000000025',
  'b1000000-0000-4000-8000-000000000003',
  'Parcel recall', 'PARCEL_RECALL', 'SURCHARGE', 'PER_PARCEL',
  49, 'SEK', false, true, '2026-08-18', 50,
  'Post-order event.'
),
(
  'b1000000-0000-4000-8000-000000000026',
  'b1000000-0000-4000-8000-000000000003',
  'Convert Box parcel to Home parcel', 'CONVERT_BOX_TO_HOME', 'SURCHARGE', 'PER_PARCEL',
  49, 'SEK', false, true, '2026-08-18', 60,
  'Plus Home fee. Event-based; Locker product not priced in Phase 2C.'
),
(
  'b1000000-0000-4000-8000-000000000027',
  'b1000000-0000-4000-8000-000000000003',
  'Merchant Digital ID Verification', 'DIGITAL_ID', 'SURCHARGE', 'PER_PARCEL',
  5, 'SEK', false, true, '2026-08-18', 70,
  'Conditional — only when explicitly selected at estimate time.'
),
(
  'b1000000-0000-4000-8000-000000000028',
  'b1000000-0000-4000-8000-000000000003',
  'Remote Area Delivery Home', 'REMOTE_AREA_HOME', 'SURCHARGE', 'PER_PARCEL',
  10, 'SEK', false, true, '2026-08-18', 80,
  'NOT APPLICABLE TO SWEDEN. Footnote: only Norway outside Oslo. Never auto-apply for SE.'
),
(
  'b1000000-0000-4000-8000-000000000029',
  'b1000000-0000-4000-8000-000000000003',
  'Remote Area Delivery Box', 'REMOTE_AREA_BOX', 'SURCHARGE', 'PER_PARCEL',
  5, 'SEK', false, true, '2026-08-18', 90,
  'NOT APPLICABLE TO SWEDEN. Footnote: only Norway outside Oslo.'
),
(
  'b1000000-0000-4000-8000-000000000030',
  'b1000000-0000-4000-8000-000000000003',
  'Cancelled after deadline returned', 'CANCEL_AFTER_DEADLINE', 'SURCHARGE', 'PER_PARCEL',
  69, 'SEK', false, true, '2026-08-18', 100,
  'Post-order event.'
),
(
  'b1000000-0000-4000-8000-000000000031',
  'b1000000-0000-4000-8000-000000000003',
  'Return label fee', 'RETURN_LABEL', 'SURCHARGE', 'PER_PARCEL',
  2, 'SEK', false, true, '2026-08-18', 110,
  'Post-order / returns.'
)
ON CONFLICT (id) DO NOTHING;
