-- Reference tables for Country and Region (predefined lists)
-- Prevents mixing e.g. "FR" and "France"; used in producer invite, admin producer form, producer profile.

-- ============================================
-- 1. COUNTRIES (ISO 3166-1 alpha-2)
-- ============================================
CREATE TABLE IF NOT EXISTS countries (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

COMMENT ON TABLE countries IS 'Predefined countries; store code in producers.country_code and use for validation';

INSERT INTO countries (code, name) VALUES
  ('SE', 'Sweden'),
  ('NO', 'Norway'),
  ('DK', 'Denmark'),
  ('FI', 'Finland'),
  ('DE', 'Germany'),
  ('FR', 'France'),
  ('GB', 'United Kingdom'),
  ('ES', 'Spain'),
  ('IT', 'Italy'),
  ('PT', 'Portugal'),
  ('AT', 'Austria'),
  ('CH', 'Switzerland')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

-- ============================================
-- 2. REGIONS (wine regions; optional link to country)
-- ============================================
CREATE TABLE IF NOT EXISTS regions (
  value TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  country_code TEXT REFERENCES countries(code) ON DELETE SET NULL
);

COMMENT ON TABLE regions IS 'Predefined wine regions; store value in producers.region. country_code filters regions by country in UI';

-- France
INSERT INTO regions (value, label, country_code) VALUES
  ('Languedoc', 'Languedoc', 'FR'),
  ('Languedoc-Roussillon', 'Languedoc-Roussillon', 'FR'),
  ('Roussillon', 'Roussillon', 'FR'),
  ('Bordeaux', 'Bordeaux', 'FR'),
  ('Burgundy', 'Burgundy', 'FR'),
  ('Rhône', 'Rhône', 'FR'),
  ('Champagne', 'Champagne', 'FR'),
  ('Loire', 'Loire', 'FR'),
  ('Alsace', 'Alsace', 'FR'),
  ('Provence', 'Provence', 'FR'),
  ('Beaujolais', 'Beaujolais', 'FR'),
  ('Jura', 'Jura', 'FR'),
  ('Savoie', 'Savoie', 'FR'),
  ('South West France', 'South West France', 'FR'),
  ('Corsica', 'Corsica', 'FR')
ON CONFLICT (value) DO UPDATE SET label = EXCLUDED.label, country_code = EXCLUDED.country_code;

-- Spain
INSERT INTO regions (value, label, country_code) VALUES
  ('Rioja', 'Rioja', 'ES'),
  ('Ribera del Duero', 'Ribera del Duero', 'ES'),
  ('Priorat', 'Priorat', 'ES'),
  ('Catalonia', 'Catalonia', 'ES'),
  ('Andalusia', 'Andalusia', 'ES')
ON CONFLICT (value) DO UPDATE SET label = EXCLUDED.label, country_code = EXCLUDED.country_code;

-- Italy
INSERT INTO regions (value, label, country_code) VALUES
  ('Tuscany', 'Tuscany', 'IT'),
  ('Piedmont', 'Piedmont', 'IT'),
  ('Veneto', 'Veneto', 'IT'),
  ('Sicily', 'Sicily', 'IT')
ON CONFLICT (value) DO UPDATE SET label = EXCLUDED.label, country_code = EXCLUDED.country_code;

-- Portugal
INSERT INTO regions (value, label, country_code) VALUES
  ('Douro', 'Douro', 'PT'),
  ('Alentejo', 'Alentejo', 'PT')
ON CONFLICT (value) DO UPDATE SET label = EXCLUDED.label, country_code = EXCLUDED.country_code;

-- Germany
INSERT INTO regions (value, label, country_code) VALUES
  ('Mosel', 'Mosel', 'DE'),
  ('Rheingau', 'Rheingau', 'DE'),
  ('Baden', 'Baden', 'DE')
ON CONFLICT (value) DO UPDATE SET label = EXCLUDED.label, country_code = EXCLUDED.country_code;

-- Austria
INSERT INTO regions (value, label, country_code) VALUES
  ('Wachau', 'Wachau', 'AT'),
  ('Burgenland', 'Burgenland', 'AT')
ON CONFLICT (value) DO UPDATE SET label = EXCLUDED.label, country_code = EXCLUDED.country_code;

-- Other (no country filter)
INSERT INTO regions (value, label, country_code) VALUES
  ('Other', 'Other', NULL)
ON CONFLICT (value) DO UPDATE SET label = EXCLUDED.label, country_code = EXCLUDED.country_code;

-- ============================================
-- 3. RLS: allow read for anon/authenticated
-- ============================================
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "countries_read_all" ON countries;
CREATE POLICY "countries_read_all" ON countries
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "regions_read_all" ON regions;
CREATE POLICY "regions_read_all" ON regions
  FOR SELECT USING (true);

-- Only service role / admin should insert/update (no policy = only bypass with service role)
-- For app-driven updates, add authenticated policies later if needed.
