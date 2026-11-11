-- Extend wines.region allowlist with Corse, Provence, Savoie, Bugey.
-- File only — do NOT apply from an agent.
-- Spelling/style matches migrations/272_wine_regions_allowlist.sql
-- (French title case; diacritics only where already used e.g. Rhône).
-- Existing allowlisted values remain valid (DROP + recreate CHECK).

-- 1. Reference rows (regions table)
INSERT INTO regions (value, label, country_code) VALUES
  ('Corse', 'Corse', 'FR'),
  ('Provence', 'Provence', 'FR'),
  ('Savoie', 'Savoie', 'FR'),
  ('Bugey', 'Bugey', 'FR')
ON CONFLICT (value) DO UPDATE
SET label = EXCLUDED.label,
    country_code = EXCLUDED.country_code;

-- 2. CHECK: previous 10 + four new (or NULL)
ALTER TABLE wines DROP CONSTRAINT IF EXISTS wines_region_allowlist_check;
ALTER TABLE wines
  ADD CONSTRAINT wines_region_allowlist_check
  CHECK (
    region IS NULL
    OR region IN (
      'Languedoc',
      'Beaujolais',
      'Loire',
      'Bourgogne',
      'Jura',
      'Champagne',
      'Rhône',
      'Roussillon',
      'Alsace',
      'Sud-Ouest',
      'Corse',
      'Provence',
      'Savoie',
      'Bugey'
    )
  );
