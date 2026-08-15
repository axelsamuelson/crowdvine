-- Migration 196: Generic inbound freight pricing engine (Phase 2B).
-- Rate catalogue vs pallet quote snapshots. Does NOT change live 120-bottle readiness
-- or customer shipping / checkout amortization.
-- Date: 2026-08-15

-- ---------------------------------------------------------------------------
-- 1. logistics_providers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS logistics_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT,
  default_currency TEXT NOT NULL DEFAULT 'EUR',
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT logistics_providers_code_unique UNIQUE (code)
);

COMMENT ON TABLE logistics_providers IS
  'Generic logistics / freight providers (inbound or outbound). Not Hillebrand-specific.';

-- ---------------------------------------------------------------------------
-- 2. freight_services (lanes / products)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS freight_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES logistics_providers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'INBOUND'
    CHECK (direction IN ('INBOUND', 'OUTBOUND')),
  origin_country TEXT,
  origin_region_code TEXT,
  origin_description TEXT,
  destination_country TEXT,
  destination_region_code TEXT,
  destination_description TEXT,
  route_description TEXT,
  transport_mode TEXT NOT NULL
    CHECK (transport_mode IN ('SEA', 'ROAD', 'RAIL', 'AIR', 'MULTIMODAL')),
  pricing_type TEXT NOT NULL DEFAULT 'RATE_CARD'
    CHECK (pricing_type IN ('RATE_CARD', 'SPOT_QUOTE')),
  active BOOLEAN NOT NULL DEFAULT true,
  lead_time_min_days INTEGER,
  lead_time_max_days INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_freight_services_provider_id
  ON freight_services (provider_id);

COMMENT ON TABLE freight_services IS
  'Provider transport product/lane. Supports inbound today; outbound (e.g. Instabee) later.';

-- ---------------------------------------------------------------------------
-- 3. freight_rates (base commercial price for a service)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS freight_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freight_service_id UUID NOT NULL REFERENCES freight_services(id) ON DELETE CASCADE,
  base_price_amount NUMERIC(14, 4),
  currency TEXT NOT NULL DEFAULT 'EUR',
  unit_type TEXT NOT NULL DEFAULT 'PER_PALLET'
    CHECK (unit_type IN ('FIXED', 'PER_PALLET', 'PER_KG', 'SPOT_QUOTE')),
  max_weight_kg NUMERIC(12, 3),
  max_pallets INTEGER,
  pallet_type TEXT,
  valid_from DATE,
  valid_to DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  pricing_type TEXT NOT NULL DEFAULT 'FIXED'
    CHECK (pricing_type IN ('FIXED', 'PER_PALLET', 'PER_KG', 'SPOT_QUOTE')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_freight_rates_service_id
  ON freight_rates (freight_service_id);

COMMENT ON TABLE freight_rates IS
  'Reusable base rates. Historical pallet quotes snapshot amounts — do not mutate past quotes.';

-- ---------------------------------------------------------------------------
-- 4. freight_rate_components (surcharges / add-ons)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS freight_rate_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freight_rate_id UUID NOT NULL REFERENCES freight_rates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  component_kind TEXT NOT NULL DEFAULT 'SURCHARGE'
    CHECK (component_kind IN ('SURCHARGE', 'ADD_ON', 'FEE', 'OTHER')),
  calculation_type TEXT NOT NULL
    CHECK (calculation_type IN (
      'FIXED',
      'PER_PALLET',
      'PER_KG',
      'PERCENT_OF_BASE',
      'PERCENT_OF_SUBTOTAL',
      'SPOT_QUOTE'
    )),
  -- For FIXED/PER_*: major currency units. For PERCENT_*: percent points (17.1 = 17.1%).
  -- NULL when SPOT_QUOTE / price unknown.
  value NUMERIC(14, 6),
  currency TEXT,
  is_mandatory BOOLEAN NOT NULL DEFAULT false,
  is_optional BOOLEAN NOT NULL DEFAULT false,
  valid_from DATE,
  valid_to DATE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT freight_rate_components_mandatory_optional_chk
    CHECK (NOT (is_mandatory AND is_optional))
);

CREATE INDEX IF NOT EXISTS idx_freight_rate_components_rate_id
  ON freight_rate_components (freight_rate_id);

COMMENT ON COLUMN freight_rate_components.calculation_type IS
  'PERCENT_OF_BASE = % of base only. PERCENT_OF_SUBTOTAL = % of (base + non-percentage components). Never compound % on %.';

-- ---------------------------------------------------------------------------
-- 5. pallet_freight_quotes (frozen per-pallet instances)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pallet_freight_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pallet_id UUID NOT NULL REFERENCES pallets(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES logistics_providers(id) ON DELETE SET NULL,
  freight_service_id UUID REFERENCES freight_services(id) ON DELETE SET NULL,
  freight_rate_id UUID REFERENCES freight_rates(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN (
      'DRAFT',
      'ESTIMATED',
      'QUOTED',
      'SELECTED',
      'EXPIRED',
      'REJECTED',
      'INCOMPLETE'
    )),
  transport_mode TEXT,
  currency TEXT NOT NULL DEFAULT 'EUR',
  base_amount_minor INTEGER,
  weight_kg NUMERIC(12, 3),
  pallet_count INTEGER NOT NULL DEFAULT 1,
  pallet_type TEXT,
  component_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  quote_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_amount_minor INTEGER,
  fx_rate_to_sek NUMERIC(18, 8),
  total_cost_sek_cents INTEGER,
  quoted_at TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  lead_time_min_days INTEGER,
  lead_time_max_days INTEGER,
  selected BOOLEAN NOT NULL DEFAULT false,
  can_calculate BOOLEAN NOT NULL DEFAULT false,
  requires_spot_quote BOOLEAN NOT NULL DEFAULT false,
  economically_usable BOOLEAN NOT NULL DEFAULT false,
  weight_compatibility TEXT NOT NULL DEFAULT 'UNKNOWN'
    CHECK (weight_compatibility IN ('UNKNOWN', 'COMPATIBLE', 'INCOMPATIBLE')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pallet_freight_quotes_pallet_id
  ON pallet_freight_quotes (pallet_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pallet_freight_quotes_one_selected
  ON pallet_freight_quotes (pallet_id)
  WHERE selected = true;

COMMENT ON TABLE pallet_freight_quotes IS
  'Frozen inbound freight quote for a pallet. Rate-card changes must not mutate historical rows.';

-- ---------------------------------------------------------------------------
-- 6. pallets.selected_inbound_freight_quote_id
-- ---------------------------------------------------------------------------
ALTER TABLE pallets
  ADD COLUMN IF NOT EXISTS selected_inbound_freight_quote_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pallets_selected_inbound_freight_quote_id_fkey'
  ) THEN
    ALTER TABLE pallets
      ADD CONSTRAINT pallets_selected_inbound_freight_quote_id_fkey
      FOREIGN KEY (selected_inbound_freight_quote_id)
      REFERENCES pallet_freight_quotes(id)
      ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON COLUMN pallets.selected_inbound_freight_quote_id IS
  'Selected inbound freight quote for shadow economic freight target. Does not control live completion.';

COMMENT ON COLUMN pallets.freight_target_cents IS
  'Manual shadow freight override (öre). Precedence: freight_target_cents > selected quote SEK > cost_cents.';

-- ---------------------------------------------------------------------------
-- 7. updated_at triggers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_freight_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_logistics_providers_updated_at ON logistics_providers;
CREATE TRIGGER trg_logistics_providers_updated_at
  BEFORE UPDATE ON logistics_providers
  FOR EACH ROW EXECUTE FUNCTION set_freight_updated_at();

DROP TRIGGER IF EXISTS trg_freight_services_updated_at ON freight_services;
CREATE TRIGGER trg_freight_services_updated_at
  BEFORE UPDATE ON freight_services
  FOR EACH ROW EXECUTE FUNCTION set_freight_updated_at();

DROP TRIGGER IF EXISTS trg_freight_rates_updated_at ON freight_rates;
CREATE TRIGGER trg_freight_rates_updated_at
  BEFORE UPDATE ON freight_rates
  FOR EACH ROW EXECUTE FUNCTION set_freight_updated_at();

DROP TRIGGER IF EXISTS trg_freight_rate_components_updated_at ON freight_rate_components;
CREATE TRIGGER trg_freight_rate_components_updated_at
  BEFORE UPDATE ON freight_rate_components
  FOR EACH ROW EXECUTE FUNCTION set_freight_updated_at();

DROP TRIGGER IF EXISTS trg_pallet_freight_quotes_updated_at ON pallet_freight_quotes;
CREATE TRIGGER trg_pallet_freight_quotes_updated_at
  BEFORE UPDATE ON pallet_freight_quotes
  FOR EACH ROW EXECUTE FUNCTION set_freight_updated_at();

-- ---------------------------------------------------------------------------
-- 8. RLS — admin/service-role only (no customer access via anon)
-- ---------------------------------------------------------------------------
ALTER TABLE logistics_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE freight_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE freight_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE freight_rate_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE pallet_freight_quotes ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated → blocked by RLS; service role bypasses.

-- ---------------------------------------------------------------------------
-- 9. Seed: Hillebrand FR34 → Sweden (July surcharge rates)
-- ---------------------------------------------------------------------------
INSERT INTO logistics_providers (id, name, code, default_currency, active, notes)
VALUES (
  'a1000000-0000-4000-8000-000000000001',
  'Hillebrand',
  'HILLEBRAND',
  'EUR',
  true,
  'Wine logistics. Sea consolidation via Amsterdam; road available as spot.'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO freight_services (
  id, provider_id, name, direction,
  origin_country, origin_region_code, origin_description,
  destination_country, destination_description,
  route_description, transport_mode, pricing_type, active, notes
) VALUES (
  'a1000000-0000-4000-8000-000000000002',
  'a1000000-0000-4000-8000-000000000001',
  'FR34 → Sweden via Amsterdam',
  'INBOUND',
  'FR', 'FR34', 'Hérault / Languedoc (FR34)',
  'SE', 'Sweden',
  'FR34 → Amsterdam (consolidation) → sea to Sweden',
  'MULTIMODAL',
  'RATE_CARD',
  true,
  'Sea option. Pallet cover and cooling not included in base quote.'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO freight_services (
  id, provider_id, name, direction,
  origin_country, origin_region_code, origin_description,
  destination_country, destination_description,
  route_description, transport_mode, pricing_type, active, notes
) VALUES (
  'a1000000-0000-4000-8000-000000000003',
  'a1000000-0000-4000-8000-000000000001',
  'FR34 → Sweden Road',
  'INBOUND',
  'FR', 'FR34', 'Hérault / Languedoc (FR34)',
  'SE', 'Sweden',
  'FR34 → Sweden by road',
  'ROAD',
  'SPOT_QUOTE',
  true,
  'Road is spot-priced only. Typically more expensive, shorter lead time. No invented price.'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO freight_rates (
  id, freight_service_id,
  base_price_amount, currency, unit_type,
  max_weight_kg, max_pallets, pallet_type,
  valid_from, active, pricing_type, notes
) VALUES (
  'a1000000-0000-4000-8000-000000000004',
  'a1000000-0000-4000-8000-000000000002',
  308, 'EUR', 'PER_PALLET',
  800, 1, 'EUR_PALLET',
  '2025-07-01', true, 'PER_PALLET',
  'Hillebrand sea base: 1 EUR pallet, max 800 kg, 308 EUR.'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO freight_rates (
  id, freight_service_id,
  base_price_amount, currency, unit_type,
  max_weight_kg, max_pallets, pallet_type,
  valid_from, active, pricing_type, notes
) VALUES (
  'a1000000-0000-4000-8000-000000000009',
  'a1000000-0000-4000-8000-000000000003',
  NULL, 'EUR', 'SPOT_QUOTE',
  NULL, 1, 'EUR_PALLET',
  '2025-07-01', true, 'SPOT_QUOTE',
  'Road spot — enter amount on pallet quote; do not invent a catalogue price.'
)
ON CONFLICT (id) DO NOTHING;

-- July fuel / emergency fuel (PERCENT_OF_BASE). Version via valid_from — do not overwrite in place for history.
INSERT INTO freight_rate_components (
  id, freight_rate_id, name, code, component_kind, calculation_type,
  value, currency, is_mandatory, is_optional, valid_from, sort_order, notes
) VALUES
(
  'a1000000-0000-4000-8000-000000000005',
  'a1000000-0000-4000-8000-000000000004',
  'Fuel surcharge', 'FUEL', 'SURCHARGE', 'PERCENT_OF_BASE',
  17.1, NULL, true, false, '2025-07-01', 10,
  'July rate — time-dependent. Create a new component row for later months.'
),
(
  'a1000000-0000-4000-8000-000000000006',
  'a1000000-0000-4000-8000-000000000004',
  'Emergency fuel surcharge', 'EMERGENCY_FUEL', 'SURCHARGE', 'PERCENT_OF_BASE',
  8.6, NULL, true, false, '2025-07-01', 20,
  'July rate — percent of base only (not compounded on fuel).'
),
(
  'a1000000-0000-4000-8000-000000000007',
  'a1000000-0000-4000-8000-000000000004',
  'Pallet cover', 'PALLET_COVER', 'ADD_ON', 'SPOT_QUOTE',
  NULL, 'EUR', false, true, '2025-07-01', 30,
  'Optional. Price unknown — requires quote amount when selected.'
),
(
  'a1000000-0000-4000-8000-000000000008',
  'a1000000-0000-4000-8000-000000000004',
  'Cooling / refrigerated transport', 'COOLING', 'ADD_ON', 'SPOT_QUOTE',
  NULL, 'EUR', false, true, '2025-07-01', 40,
  'Optional. Price unknown — requires quote amount when selected.'
)
ON CONFLICT (id) DO NOTHING;
