-- crowdvine-checkout-audit ONLY (ref msdfjrrokcmjifetuwgc).
-- Nullable columns the live Next cart/checkout select paths expect.
-- Idempotent. NEVER apply to abrnvjqwpdkodgrtezeg.

DO $$
BEGIN
  IF (
    SELECT value FROM checkout_audit_meta WHERE key = 'project_ref'
  ) IS DISTINCT FROM 'msdfjrrokcmjifetuwgc' THEN
    RAISE EXCEPTION 'REFUSED: wrong project_ref for app compat columns';
  END IF;
END $$;

ALTER TABLE wines
  ADD COLUMN IF NOT EXISTS b2b_margin_percentage NUMERIC,
  ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'producer';

UPDATE wines SET source_type = 'producer' WHERE source_type IS NULL;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferred_locale TEXT;

-- PostgREST join producers → pallet_zones!pickup_zone_id (zone-matching)
ALTER TABLE producers
  ADD COLUMN IF NOT EXISTS pickup_zone_id UUID REFERENCES pallet_zones(id);

UPDATE producers
SET pickup_zone_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'
WHERE id = 'cccccccc-cccc-cccc-cccc-ccccccccccc1'
  AND pickup_zone_id IS NULL;

ALTER TABLE pallets
  ADD COLUMN IF NOT EXISTS current_pickup_producer_id UUID REFERENCES producers(id);

ALTER TABLE user_memberships
  ADD COLUMN IF NOT EXISTS pact_points INTEGER NOT NULL DEFAULT 0;

-- Soft UI reads (logo); empty table is fine
CREATE TABLE IF NOT EXISTS site_content (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_site_content_select ON site_content;
CREATE POLICY audit_site_content_select ON site_content
  FOR SELECT USING (true);

INSERT INTO checkout_audit_meta (key, value) VALUES
  ('schema_app_compat_columns', now()::text)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
