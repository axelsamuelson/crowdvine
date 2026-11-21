-- Mandatory food information on wines (EU 1169/2011 art. 14; wine rules in
-- 1308/2013 as amended by 2021/2117): allergens, energy, ingredients / e-label,
-- optional SO2 total, plus internal craft criteria.
--
-- File only — do NOT apply from an agent (TEST first, prod after owner yes).
-- Additive / idempotent: IF NOT EXISTS, DROP CONSTRAINT IF EXISTS then re-ADD.
-- No data backfill.

-- ---------------------------------------------------------------------------
-- 1) public.wines — food-info columns
-- ---------------------------------------------------------------------------

ALTER TABLE public.wines
  ADD COLUMN IF NOT EXISTS allergens text[];

ALTER TABLE public.wines
  DROP CONSTRAINT IF EXISTS wines_allergens_allowlist_check;

ALTER TABLE public.wines
  ADD CONSTRAINT wines_allergens_allowlist_check
  CHECK (allergens <@ ARRAY['sulfites', 'egg', 'milk']::text[]);

COMMENT ON COLUMN public.wines.allergens IS
  'Declarable allergens for pre-purchase display. NULL = not yet checked; {} = verified no declarable allergens; otherwise subset of {sulfites, egg, milk}.';

ALTER TABLE public.wines
  ADD COLUMN IF NOT EXISTS ingredients jsonb;

ALTER TABLE public.wines
  DROP CONSTRAINT IF EXISTS wines_ingredients_sv_en_object_check;

ALTER TABLE public.wines
  ADD CONSTRAINT wines_ingredients_sv_en_object_check
  CHECK (
    ingredients IS NULL
    OR (
      jsonb_typeof(ingredients) = 'object'
      -- Only keys sv/en allowed (remainder after deletion must be empty).
      AND (ingredients - 'sv' - 'en') = '{}'::jsonb
      AND (NOT (ingredients ? 'sv') OR jsonb_typeof(ingredients -> 'sv') = 'string')
      AND (NOT (ingredients ? 'en') OR jsonb_typeof(ingredients -> 'en') = 'string')
    )
  );

COMMENT ON COLUMN public.wines.ingredients IS
  'Localized ingredients text as jsonb object with optional keys sv/en (string values). NULL when unknown; prefer e_label_url when full list is published only on the e-label.';

ALTER TABLE public.wines
  ADD COLUMN IF NOT EXISTS energy_kj_100ml numeric;

ALTER TABLE public.wines
  DROP CONSTRAINT IF EXISTS wines_energy_kj_100ml_nonnegative_check;

ALTER TABLE public.wines
  ADD CONSTRAINT wines_energy_kj_100ml_nonnegative_check
  CHECK (energy_kj_100ml IS NULL OR energy_kj_100ml >= 0);

COMMENT ON COLUMN public.wines.energy_kj_100ml IS
  'Energy value in kJ per 100 ml. NULL when unknown; must be >= 0 when set.';

ALTER TABLE public.wines
  ADD COLUMN IF NOT EXISTS energy_kcal_100ml numeric;

ALTER TABLE public.wines
  DROP CONSTRAINT IF EXISTS wines_energy_kcal_100ml_nonnegative_check;

ALTER TABLE public.wines
  ADD CONSTRAINT wines_energy_kcal_100ml_nonnegative_check
  CHECK (energy_kcal_100ml IS NULL OR energy_kcal_100ml >= 0);

COMMENT ON COLUMN public.wines.energy_kcal_100ml IS
  'Energy value in kcal per 100 ml. NULL when unknown; must be >= 0 when set.';

ALTER TABLE public.wines
  ADD COLUMN IF NOT EXISTS e_label_url text;

ALTER TABLE public.wines
  DROP CONSTRAINT IF EXISTS wines_e_label_url_https_check;

ALTER TABLE public.wines
  ADD CONSTRAINT wines_e_label_url_https_check
  CHECK (e_label_url IS NULL OR e_label_url LIKE 'https://%');

COMMENT ON COLUMN public.wines.e_label_url IS
  'HTTPS URL to the electronic label (e-label) with mandatory food information. NULL when not provided.';

ALTER TABLE public.wines
  ADD COLUMN IF NOT EXISTS so2_total_mg_l numeric;

ALTER TABLE public.wines
  DROP CONSTRAINT IF EXISTS wines_so2_total_mg_l_nonnegative_check;

ALTER TABLE public.wines
  ADD CONSTRAINT wines_so2_total_mg_l_nonnegative_check
  CHECK (so2_total_mg_l IS NULL OR so2_total_mg_l >= 0);

COMMENT ON COLUMN public.wines.so2_total_mg_l IS
  'Total sulphur dioxide (SO2) in mg/L when known. NULL when unknown; must be >= 0 when set.';

-- Row-level policies on wines are not column-specific; new columns inherit the
-- same public-read (live wines) / admin-write exposure as existing wine columns.

-- ---------------------------------------------------------------------------
-- 2) public.wine_craft_criteria — internal craft flags (admin-only)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.wine_craft_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wine_id uuid NOT NULL REFERENCES public.wines (id) ON DELETE CASCADE,
  criterion text NOT NULL,
  status text NOT NULL DEFAULT 'unknown',
  note text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NULL,
  CONSTRAINT wine_craft_criteria_wine_id_criterion_unique UNIQUE (wine_id, criterion)
);

ALTER TABLE public.wine_craft_criteria
  DROP CONSTRAINT IF EXISTS wine_craft_criteria_criterion_check;

ALTER TABLE public.wine_craft_criteria
  ADD CONSTRAINT wine_craft_criteria_criterion_check
  CHECK (
    criterion IN (
      'own_vineyards',
      'organic_farming',
      'spontaneous_fermentation',
      'manual_harvest',
      'additives'
    )
  );

ALTER TABLE public.wine_craft_criteria
  DROP CONSTRAINT IF EXISTS wine_craft_criteria_status_check;

ALTER TABLE public.wine_craft_criteria
  ADD CONSTRAINT wine_craft_criteria_status_check
  CHECK (status IN ('met', 'not_met', 'unknown'));

COMMENT ON TABLE public.wine_craft_criteria IS
  'Internal craft criteria per wine (admin-only). Not exposed for public shop read yet.';

COMMENT ON COLUMN public.wine_craft_criteria.criterion IS
  'Allowlisted craft criterion: own_vineyards | organic_farming | spontaneous_fermentation | manual_harvest | additives.';

COMMENT ON COLUMN public.wine_craft_criteria.status IS
  'met | not_met | unknown (default).';

COMMENT ON COLUMN public.wine_craft_criteria.note IS
  'Optional free-text note for the criterion assessment.';

COMMENT ON COLUMN public.wine_craft_criteria.updated_by IS
  'Optional auth user id of the last editor (no FK; may be null for agent/service writes).';

CREATE INDEX IF NOT EXISTS idx_wine_craft_criteria_wine_id
  ON public.wine_craft_criteria (wine_id);

ALTER TABLE public.wine_craft_criteria ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.wine_craft_criteria FROM PUBLIC;
REVOKE ALL ON public.wine_craft_criteria FROM anon;
REVOKE ALL ON public.wine_craft_criteria FROM authenticated;

GRANT ALL ON public.wine_craft_criteria TO service_role;

DROP POLICY IF EXISTS "Admins manage wine craft criteria"
  ON public.wine_craft_criteria;
CREATE POLICY "Admins manage wine craft criteria"
  ON public.wine_craft_criteria
  FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- 3) Extend wine_field_sources.field allowlist
-- Constraint name from 286_wine_field_sources.sql:
--   wine_field_sources_field_allowlist_check
-- ---------------------------------------------------------------------------

ALTER TABLE public.wine_field_sources
  DROP CONSTRAINT IF EXISTS wine_field_sources_field_allowlist_check;

ALTER TABLE public.wine_field_sources
  ADD CONSTRAINT wine_field_sources_field_allowlist_check
  CHECK (
    field IN (
      'abv',
      'region',
      'grape_varieties',
      'color',
      'description',
      'allergens',
      'ingredients',
      'energy',
      'e_label_url',
      'so2_total',
      'craft_own_vineyards',
      'craft_organic_farming',
      'craft_spontaneous_fermentation',
      'craft_manual_harvest',
      'craft_additives'
    )
  );

COMMENT ON COLUMN public.wine_field_sources.field IS
  'Allowlisted field key: abv | region | grape_varieties | color | description | allergens | ingredients | energy | e_label_url | so2_total | craft_own_vineyards | craft_organic_farming | craft_spontaneous_fermentation | craft_manual_harvest | craft_additives.';
