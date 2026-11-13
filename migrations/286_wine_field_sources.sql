-- Colette product-data: append-only provenance for wine field values.
-- File only — do NOT apply from an agent (TEST first, prod after owner yes).
--
-- Latest row per (wine_id, field) applies (history table; no UPDATE-in-place).
-- field allowlist adapted to actual wines.* columns:
--   abv, region, grape_varieties (requested "grape"), color, description.

CREATE TABLE IF NOT EXISTS public.wine_field_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wine_id uuid NOT NULL REFERENCES public.wines(id) ON DELETE CASCADE,
  field text NOT NULL,
  value text,
  source_url text NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wine_field_sources_field_allowlist_check
    CHECK (
      field IN (
        'abv',
        'region',
        'grape_varieties',
        'color',
        'description'
      )
    )
);

COMMENT ON TABLE public.wine_field_sources IS
  'Append-only wine field provenance. Latest row per (wine_id, field) wins.';

COMMENT ON COLUMN public.wine_field_sources.field IS
  'Allowlisted wines column key: abv | region | grape_varieties | color | description.';

COMMENT ON COLUMN public.wine_field_sources.value IS
  'Captured field value at fetch time (text). NULL if source had no value.';

COMMENT ON COLUMN public.wine_field_sources.agent IS
  'Optional agent/system that fetched the value (e.g. colette).';

CREATE INDEX IF NOT EXISTS idx_wine_field_sources_wine_field
  ON public.wine_field_sources (wine_id, field);

CREATE INDEX IF NOT EXISTS idx_wine_field_sources_wine_field_fetched
  ON public.wine_field_sources (wine_id, field, fetched_at DESC);

ALTER TABLE public.wine_field_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can select wine_field_sources"
  ON public.wine_field_sources;
CREATE POLICY "Admins can select wine_field_sources"
  ON public.wine_field_sources
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Admins can insert wine_field_sources"
  ON public.wine_field_sources;
CREATE POLICY "Admins can insert wine_field_sources"
  ON public.wine_field_sources
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_platform_admin());

-- No UPDATE/DELETE for anon/authenticated — history is append-only via app/service_role.
REVOKE ALL ON public.wine_field_sources FROM anon;
REVOKE ALL ON public.wine_field_sources FROM authenticated;
GRANT SELECT, INSERT ON public.wine_field_sources TO authenticated;
GRANT ALL ON public.wine_field_sources TO service_role;
