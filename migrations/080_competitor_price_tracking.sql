-- Migration 080: Competitor price + PDP link tracking
-- Tables: price_sources (competitor shop config), external_offers (latest offer per wine+source)
-- RLS: Admin-only access for both tables

-- 1) price_sources: competitor shop configuration
CREATE TABLE price_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  base_url TEXT NOT NULL,
  search_url_template TEXT,
  sitemap_url TEXT,
  adapter_type TEXT NOT NULL DEFAULT 'shopify',
  is_active BOOLEAN NOT NULL DEFAULT true,
  rate_limit_delay_ms INTEGER NOT NULL DEFAULT 2000,
  last_crawled_at TIMESTAMPTZ,
  config JSONB DEFAULT '{}'
);

COMMENT ON TABLE price_sources IS 'Competitor e-commerce sources we track for wine prices (e.g. morenaturalwine.com, primalwine.com).';
COMMENT ON COLUMN price_sources.adapter_type IS 'Adapter implementation: shopify, woocommerce, custom';
COMMENT ON COLUMN price_sources.config IS 'Adapter-specific options (selectors, API keys, etc.)';

CREATE INDEX idx_price_sources_slug ON price_sources(slug);
CREATE INDEX idx_price_sources_is_active ON price_sources(is_active) WHERE is_active = true;

-- 2) external_offers: latest offer per wine + source (one row per wine_id + price_source_id)
CREATE TABLE external_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  wine_id UUID NOT NULL REFERENCES wines(id) ON DELETE CASCADE,
  price_source_id UUID NOT NULL REFERENCES price_sources(id) ON DELETE CASCADE,
  pdp_url TEXT NOT NULL,
  price_amount NUMERIC(12, 2),
  currency TEXT DEFAULT 'SEK',
  available BOOLEAN NOT NULL DEFAULT true,
  title_raw TEXT,
  match_confidence NUMERIC(3, 2) NOT NULL,
  last_fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(wine_id, price_source_id)
);

COMMENT ON TABLE external_offers IS 'Latest competitor offer per wine per source (PDP link, price, availability, match score).';
COMMENT ON COLUMN external_offers.match_confidence IS 'Match score 0-1; only stored when above threshold';

CREATE INDEX idx_external_offers_wine_id ON external_offers(wine_id);
CREATE INDEX idx_external_offers_price_source_id ON external_offers(price_source_id);
CREATE INDEX idx_external_offers_source_fetched ON external_offers(price_source_id, last_fetched_at);

-- RLS: admin-only for both tables
ALTER TABLE price_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_offers ENABLE ROW LEVEL SECURITY;

-- price_sources: only admins can read/write
CREATE POLICY "Admins can manage price_sources" ON price_sources
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR (profiles.roles IS NOT NULL AND profiles.roles @> ARRAY['admin']::text[]))
    )
  );

-- external_offers: only admins can read/write
CREATE POLICY "Admins can manage external_offers" ON external_offers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR (profiles.roles IS NOT NULL AND profiles.roles @> ARRAY['admin']::text[]))
    )
  );
