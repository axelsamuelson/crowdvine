-- Analytics V2 etapp 1 — M2: extend annotations + backfill 10–16 nov releases.
-- Creates table if missing (TEST). Additive columns for prod.

CREATE TABLE IF NOT EXISTS admin_analytics_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  label TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Expand category check: drop old constraint if present, add V2 set
DO $$
DECLARE
  conname text;
BEGIN
  SELECT c.conname INTO conname
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'admin_analytics_annotations'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%category%';
  IF conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE admin_analytics_annotations DROP CONSTRAINT %I', conname);
  END IF;
END $$;

ALTER TABLE admin_analytics_annotations
  DROP CONSTRAINT IF EXISTS admin_analytics_annotations_category_check;

ALTER TABLE admin_analytics_annotations
  ADD CONSTRAINT admin_analytics_annotations_category_check
  CHECK (category IN (
    'seo', 'tiktok', 'b2b', 'product', 'other',
    'release', 'campaign', 'incident', 'kampanj'
  ));

ALTER TABLE admin_analytics_annotations
  ADD COLUMN IF NOT EXISTS occurred_at timestamptz,
  ADD COLUMN IF NOT EXISTS site text,
  ADD COLUMN IF NOT EXISTS url text,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS pr_number int;

UPDATE admin_analytics_annotations
SET occurred_at = (date::timestamp AT TIME ZONE 'Europe/Stockholm')
WHERE occurred_at IS NULL;

UPDATE admin_analytics_annotations
SET source = 'manual'
WHERE source IS NULL;

CREATE INDEX IF NOT EXISTS idx_admin_analytics_annotations_occurred_at
  ON admin_analytics_annotations (occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_analytics_annotations_date
  ON admin_analytics_annotations (date DESC);

ALTER TABLE admin_analytics_annotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can select analytics annotations"
  ON admin_analytics_annotations;
DROP POLICY IF EXISTS "Admins can insert analytics annotations"
  ON admin_analytics_annotations;
DROP POLICY IF EXISTS "Admins can update analytics annotations"
  ON admin_analytics_annotations;
DROP POLICY IF EXISTS "Admins can delete analytics annotations"
  ON admin_analytics_annotations;

CREATE POLICY "Admins can select analytics annotations"
  ON admin_analytics_annotations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND (
          profiles.role = 'admin'
          OR (profiles.roles IS NOT NULL AND 'admin' = ANY (profiles.roles))
        )
    )
  );

CREATE POLICY "Admins can insert analytics annotations"
  ON admin_analytics_annotations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND (
          profiles.role = 'admin'
          OR (profiles.roles IS NOT NULL AND 'admin' = ANY (profiles.roles))
        )
    )
  );

CREATE POLICY "Admins can update analytics annotations"
  ON admin_analytics_annotations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND (
          profiles.role = 'admin'
          OR (profiles.roles IS NOT NULL AND 'admin' = ANY (profiles.roles))
        )
    )
  );

CREATE POLICY "Admins can delete analytics annotations"
  ON admin_analytics_annotations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND (
          profiles.role = 'admin'
          OR (profiles.roles IS NOT NULL AND 'admin' = ANY (profiles.roles))
        )
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON admin_analytics_annotations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON admin_analytics_annotations TO authenticated;

-- Backfill known releases 10–16 nov (idempotent on pr_number + date)
INSERT INTO admin_analytics_annotations (
  date, occurred_at, label, category, site, url, source, pr_number
)
SELECT v.date, v.occurred_at, v.label, v.category, v.site, v.url, 'backfill', v.pr_number
FROM (
  VALUES
    (DATE '2026-11-10', TIMESTAMPTZ '2026-11-10 10:00:00+01', 'PR206 — release', 'release', 'pact', 'https://github.com/axelsamuelson/crowdvine/pull/206', 206),
    (DATE '2026-11-10', TIMESTAMPTZ '2026-11-10 14:00:00+01', 'Tracking /api/e', 'release', 'pact', NULL, NULL),
    (DATE '2026-11-11', TIMESTAMPTZ '2026-11-11 11:00:00+01', 'PR212 — release', 'release', 'pact', 'https://github.com/axelsamuelson/crowdvine/pull/212', 212),
    (DATE '2026-11-11', TIMESTAMPTZ '2026-11-11 16:00:00+01', 'PR218/219 — release', 'release', 'pact', 'https://github.com/axelsamuelson/crowdvine/pull/218', 218),
    (DATE '2026-11-12', TIMESTAMPTZ '2026-11-12 10:00:00+01', 'PR222 — release', 'release', 'pact', 'https://github.com/axelsamuelson/crowdvine/pull/222', 222),
    (DATE '2026-11-12', TIMESTAMPTZ '2026-11-12 15:00:00+01', 'PR223 — release', 'release', 'pact', 'https://github.com/axelsamuelson/crowdvine/pull/223', 223),
    (DATE '2026-11-13', TIMESTAMPTZ '2026-11-13 10:00:00+01', 'PR239/240 — release', 'release', 'pact', 'https://github.com/axelsamuelson/crowdvine/pull/239', 239),
    (DATE '2026-11-13', TIMESTAMPTZ '2026-11-13 12:00:00+01', 'PR238/237 — release', 'release', 'pact', 'https://github.com/axelsamuelson/crowdvine/pull/238', 238),
    (DATE '2026-11-13', TIMESTAMPTZ '2026-11-13 14:00:00+01', 'PR230/233 — release', 'release', 'pact', 'https://github.com/axelsamuelson/crowdvine/pull/230', 230),
    (DATE '2026-11-13', TIMESTAMPTZ '2026-11-13 15:15:00+01', 'PR246 — kassa OTP hotfix', 'release', 'pact', 'https://github.com/axelsamuelson/crowdvine/pull/246', 246),
    (DATE '2026-11-14', TIMESTAMPTZ '2026-11-14 10:00:00+01', 'PR250 — release', 'release', 'pact', 'https://github.com/axelsamuelson/crowdvine/pull/250', 250),
    (DATE '2026-11-14', TIMESTAMPTZ '2026-11-14 12:00:00+01', 'PR243 — release', 'release', 'pact', 'https://github.com/axelsamuelson/crowdvine/pull/243', 243),
    (DATE '2026-11-14', TIMESTAMPTZ '2026-11-14 15:00:00+01', 'PR244/253/249/236 — release', 'release', 'pact', 'https://github.com/axelsamuelson/crowdvine/pull/244', 244),
    (DATE '2026-11-15', TIMESTAMPTZ '2026-11-15 10:00:00+01', 'PR242 — release', 'release', 'pact', 'https://github.com/axelsamuelson/crowdvine/pull/242', 242),
    (DATE '2026-11-15', TIMESTAMPTZ '2026-11-15 14:00:00+01', 'PR258 — release', 'release', 'pact', 'https://github.com/axelsamuelson/crowdvine/pull/258', 258),
    (DATE '2026-11-16', TIMESTAMPTZ '2026-11-16 01:55:00+01', 'PR269 — analytics perf', 'release', 'pact', 'https://github.com/axelsamuelson/crowdvine/pull/269', 269),
    (DATE '2026-11-16', TIMESTAMPTZ '2026-11-16 02:30:00+01', 'Kanaltest organisk sök startar', 'kampanj', 'pact', NULL, NULL),
    (DATE '2026-12-14', TIMESTAMPTZ '2026-12-14 00:00:00+01', 'Kanaltest organisk sök utvärderas', 'kampanj', 'pact', NULL, NULL)
) AS v(date, occurred_at, label, category, site, url, pr_number)
WHERE NOT EXISTS (
  SELECT 1 FROM admin_analytics_annotations a
  WHERE a.label = v.label AND a.date = v.date
);

-- Annotation for bottfilter v2 (created when E5 applied; also seeded here)
INSERT INTO admin_analytics_annotations (
  date, occurred_at, label, category, site, source
)
SELECT
  DATE '2026-11-19',
  TIMESTAMPTZ '2026-11-19 12:00:00+01',
  'Bottfilter v2 aktivt',
  'incident',
  'pact',
  'backfill'
WHERE NOT EXISTS (
  SELECT 1 FROM admin_analytics_annotations
  WHERE label = 'Bottfilter v2 aktivt'
);
