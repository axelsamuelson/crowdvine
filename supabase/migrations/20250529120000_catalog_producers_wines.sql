-- Wine/producer marketing catalog (separate from operational public.producers / public.wines).
-- Operational tables already exist; catalog uses catalog_* names.

CREATE TABLE IF NOT EXISTS catalog_producers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  subregion TEXT,
  country TEXT NOT NULL DEFAULT 'France',
  founded_year INTEGER,
  bio_short TEXT,
  bio_long TEXT,
  certification TEXT CHECK (
    certification IS NULL OR certification IN (
      'organic_certified',
      'biodynamic_certified',
      'natural',
      'sustainable',
      'conventional'
    )
  ),
  contact_name TEXT,
  contact_email TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_catalog_producers_name ON catalog_producers (name);
CREATE INDEX IF NOT EXISTS idx_catalog_producers_deleted_at ON catalog_producers (deleted_at);

CREATE TABLE IF NOT EXISTS catalog_wines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id UUID NOT NULL REFERENCES catalog_producers(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  vintage INTEGER,
  appellation TEXT NOT NULL,
  grape_varieties TEXT[],
  type TEXT NOT NULL CHECK (
    type IN ('red', 'white', 'rosé', 'sparkling')
  ),
  price_sek INTEGER NOT NULL,
  bottle_size_ml INTEGER NOT NULL DEFAULT 750,
  tasting_notes TEXT,
  alcohol_pct NUMERIC(4, 1),
  farming TEXT CHECK (
    farming IS NULL OR farming IN (
      'organic_certified',
      'biodynamic_certified',
      'natural',
      'sustainable',
      'conventional'
    )
  ),
  serving_temp_c TEXT,
  food_pairing TEXT[],
  awards TEXT[],
  import_price_eur NUMERIC(8, 2),
  winemaker_notes TEXT,
  soil_type TEXT,
  elevation_masl INTEGER,
  yield_hl_ha NUMERIC(5, 1),
  ageing TEXT,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_catalog_wines_producer_id ON catalog_wines (producer_id);
CREATE INDEX IF NOT EXISTS idx_catalog_wines_type ON catalog_wines (type);
CREATE INDEX IF NOT EXISTS idx_catalog_wines_is_published ON catalog_wines (is_published);

COMMENT ON TABLE catalog_producers IS 'Marketing/catalog producers (bio, region, certification). Not the operational producers table.';
COMMENT ON TABLE catalog_wines IS 'Marketing/catalog wines (tasting copy, publish flag). Not the operational wines table.';

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_catalog_producers_updated_at ON catalog_producers;
CREATE TRIGGER update_catalog_producers_updated_at
  BEFORE UPDATE ON catalog_producers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_catalog_wines_updated_at ON catalog_wines;
CREATE TRIGGER update_catalog_wines_updated_at
  BEFORE UPDATE ON catalog_wines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
