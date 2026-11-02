-- Wine regions SSOT: wines.region is allowlisted (or NULL).
-- Canonical FR values match lib/wine-regions.ts. Synonym backfill from producers.region
-- (and wine.region when already allowlisted / synonym-mapped). Corse / Provence / Bugey → NULL.

-- 1. Ensure column exists (present in prod; not created in numbered migrations historically)
ALTER TABLE wines
  ADD COLUMN IF NOT EXISTS region text;

COMMENT ON COLUMN wines.region IS
  'Canonical French wine region (allowlisted) for shop filter + region pages; NULL when unassigned/out-of-allowlist';

-- 2. Upsert regions reference rows for the 10 FR allowlist values (additive; keep legacy English rows)
INSERT INTO regions (value, label, country_code) VALUES
  ('Languedoc', 'Languedoc', 'FR'),
  ('Beaujolais', 'Beaujolais', 'FR'),
  ('Loire', 'Loire', 'FR'),
  ('Bourgogne', 'Bourgogne', 'FR'),
  ('Jura', 'Jura', 'FR'),
  ('Champagne', 'Champagne', 'FR'),
  ('Rhône', 'Rhône', 'FR'),
  ('Roussillon', 'Roussillon', 'FR'),
  ('Alsace', 'Alsace', 'FR'),
  ('Sud-Ouest', 'Sud-Ouest', 'FR')
ON CONFLICT (value) DO UPDATE
SET label = EXCLUDED.label,
    country_code = EXCLUDED.country_code;

-- 3. Optional producer synonym sync (Aveyron → Sud-Ouest) so admin geography matches marketing
UPDATE producers
SET region = 'Sud-Ouest'
WHERE region = 'Aveyron';

UPDATE producers
SET region = 'Rhône'
WHERE region IN ('Vallée du Rhône', 'Rhone', 'Rhone Valley');

UPDATE producers
SET region = 'Bourgogne'
WHERE region = 'Burgundy';

UPDATE producers
SET region = 'Sud-Ouest'
WHERE region IN ('South West France', 'Sud Ouest');

-- 4. Backfill wines.region
-- Prefer keep when wine already allowlisted (e.g. Denogent Beaujolais vs producer Bourgogne);
-- else map producer, else map wine synonyms; else NULL.
WITH synonyms(src, dst) AS (
  VALUES
    ('Languedoc', 'Languedoc'),
    ('Beaujolais', 'Beaujolais'),
    ('Loire', 'Loire'),
    ('Bourgogne', 'Bourgogne'),
    ('Jura', 'Jura'),
    ('Champagne', 'Champagne'),
    ('Rhône', 'Rhône'),
    ('Roussillon', 'Roussillon'),
    ('Alsace', 'Alsace'),
    ('Sud-Ouest', 'Sud-Ouest'),
    ('Vallée du Rhône', 'Rhône'),
    ('Rhone', 'Rhône'),
    ('Rhone Valley', 'Rhône'),
    ('Burgundy', 'Bourgogne'),
    ('South West France', 'Sud-Ouest'),
    ('Sud Ouest', 'Sud-Ouest'),
    ('Aveyron', 'Sud-Ouest')
),
allowlist(v) AS (
  VALUES
    ('Languedoc'),
    ('Beaujolais'),
    ('Loire'),
    ('Bourgogne'),
    ('Jura'),
    ('Champagne'),
    ('Rhône'),
    ('Roussillon'),
    ('Alsace'),
    ('Sud-Ouest')
),
mapped AS (
  SELECT
    w.id,
    CASE
      WHEN EXISTS (SELECT 1 FROM allowlist a WHERE a.v = w.region) THEN w.region
      WHEN ps.dst IS NOT NULL THEN ps.dst
      WHEN ws.dst IS NOT NULL THEN ws.dst
      ELSE NULL
    END AS new_region
  FROM wines w
  JOIN producers p ON p.id = w.producer_id
  LEFT JOIN synonyms ps ON ps.src = p.region
  LEFT JOIN synonyms ws ON ws.src = w.region
)
UPDATE wines w
SET region = m.new_region
FROM mapped m
WHERE w.id = m.id
  AND w.region IS DISTINCT FROM m.new_region;

-- 5. CHECK: allowlisted or NULL
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
      'Sud-Ouest'
    )
  );

-- 6. Partial index for live PLP / region-page counts
CREATE INDEX IF NOT EXISTS idx_wines_region_live
  ON wines (region)
  WHERE region IS NOT NULL AND is_live IS TRUE;
