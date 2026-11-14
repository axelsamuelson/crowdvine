-- Frozen per-order-line snapshots for Swedish Tax Agency (Skatteverket)
-- alcohol tax reporting on distance selling.
--
-- Why a new table (not columns on order_reservation_items):
-- - Isolates buyer PII (name, DOB, delivery address) behind strict RLS.
-- - Values are frozen at charge/close time and must never be recomputed later.
-- - Additive only; does not alter existing order/item schemas.
--
-- Access: service_role + platform admins only. No anon/authenticated access.
--
-- Rates (verified Ingrid/CFO): Skatteverket from 2024-01-01; SFS 2026:738
-- documents small-producer reductions from 2026-07-01 (not applied yet).

CREATE TABLE IF NOT EXISTS public.alcohol_tax_reporting_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL
    REFERENCES public.order_reservations (id) ON DELETE RESTRICT,
  order_reservation_item_id UUID NOT NULL
    REFERENCES public.order_reservation_items (id) ON DELETE RESTRICT,
  -- Buyer identity / delivery (frozen at snapshot time)
  buyer_full_name TEXT,
  buyer_date_of_birth DATE,
  delivery_street TEXT,
  delivery_postal_code TEXT,
  delivery_city TEXT,
  delivery_country TEXT,
  -- Line product
  wine_id UUID REFERENCES public.wines (id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  -- Total volume for the line (bottle volume × quantity), litres
  volume_liters NUMERIC(12, 4) NOT NULL CHECK (volume_liters > 0),
  bottle_volume_liters NUMERIC(12, 4) CHECK (bottle_volume_liters IS NULL OR bottle_volume_liters > 0),
  -- ABV as numeric percent (e.g. 13.5). NULL when missing — never guessed.
  alcohol_percentage NUMERIC(6, 3),
  -- Alcohol tax for this line in SEK (rate × volume_liters, rounded once).
  -- NULL when needs_review.
  alcohol_tax_sek NUMERIC(12, 4),
  needs_review BOOLEAN NOT NULL DEFAULT FALSE,
  -- TODO: Reserved for future explicit Skatteverket product class
  -- (still wine vs mellanklass/fortified). Always NULL until we have a
  -- trusted product-type field. Never invent fortified/mellanklass rates
  -- (e.g. 37,34 kr/l) — flag needs_review instead when indicated.
  product_tax_category TEXT,
  -- Small-producer reduction % (SFS 2026:738, 3 a §, from 2026-07-01).
  -- Always NULL for now; requires a producer certificate before use.
  -- Full statutory tax is stored in alcohol_tax_sek until then.
  small_producer_reduction_pct NUMERIC(5, 2)
    CHECK (
      small_producer_reduction_pct IS NULL
      OR (
        small_producer_reduction_pct >= 0
        AND small_producer_reduction_pct <= 100
      )
    ),
  snapped_at TIMESTAMPTZ NOT NULL,
  trigger_source TEXT NOT NULL
    CHECK (
      trigger_source IN (
        'pallet_close',
        'direct_box_confirm',
        'legacy_auto_charge'
      )
    ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT alcohol_tax_reporting_lines_item_unique
    UNIQUE (order_reservation_item_id),
  CONSTRAINT alcohol_tax_reporting_lines_review_chk CHECK (
    (needs_review = TRUE AND alcohol_tax_sek IS NULL)
    OR (needs_review = FALSE AND alcohol_percentage IS NOT NULL AND alcohol_tax_sek IS NOT NULL)
  )
);

COMMENT ON TABLE public.alcohol_tax_reporting_lines IS
  'Frozen Skatteverket alcohol-tax reporting lines (distance selling). Written once at charge/close with service_role; never recomputed.';

COMMENT ON COLUMN public.alcohol_tax_reporting_lines.alcohol_percentage IS
  'Frozen ABV percent at snapshot time. NULL + needs_review when wine ABV was missing — never invent a value.';

COMMENT ON COLUMN public.alcohol_tax_reporting_lines.alcohol_tax_sek IS
  'Line alcohol tax in SEK = Skatteverket wine rate (SEK/L by ABV band) × volume_liters, rounded once to 2 decimals. NULL when needs_review.';

COMMENT ON COLUMN public.alcohol_tax_reporting_lines.volume_liters IS
  'Total litres for the line (bottle_volume_liters × quantity). Tax is computed on this total, not per bottle then multiplied.';

COMMENT ON COLUMN public.alcohol_tax_reporting_lines.needs_review IS
  'True when ABV was missing/out-of-band or fortified/mellanklass was indicated; tax left NULL for manual review.';

COMMENT ON COLUMN public.alcohol_tax_reporting_lines.product_tax_category IS
  'TODO: future Skatteverket product class (still wine vs mellanklass). Always NULL until an explicit product-type field exists; never guess fortified rates.';

COMMENT ON COLUMN public.alcohol_tax_reporting_lines.small_producer_reduction_pct IS
  'Small-producer reduction % (SFS 2026:738 3 a §). Always NULL until a producer certificate is available; full tax stored meanwhile.';

CREATE INDEX IF NOT EXISTS idx_alcohol_tax_reporting_lines_reservation
  ON public.alcohol_tax_reporting_lines (reservation_id);

CREATE INDEX IF NOT EXISTS idx_alcohol_tax_reporting_lines_snapped_at
  ON public.alcohol_tax_reporting_lines (snapped_at DESC);

CREATE INDEX IF NOT EXISTS idx_alcohol_tax_reporting_lines_needs_review
  ON public.alcohol_tax_reporting_lines (needs_review)
  WHERE needs_review = TRUE;

ALTER TABLE public.alcohol_tax_reporting_lines ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.alcohol_tax_reporting_lines FROM PUBLIC;
REVOKE ALL ON public.alcohol_tax_reporting_lines FROM anon;
REVOKE ALL ON public.alcohol_tax_reporting_lines FROM authenticated;

GRANT ALL ON public.alcohol_tax_reporting_lines TO service_role;

DROP POLICY IF EXISTS "Admins select alcohol tax reporting lines"
  ON public.alcohol_tax_reporting_lines;
CREATE POLICY "Admins select alcohol tax reporting lines"
  ON public.alcohol_tax_reporting_lines
  FOR SELECT
  USING (public.is_platform_admin());

-- Admins may read only. Inserts/updates go through service_role (bypasses RLS).
-- No INSERT/UPDATE/DELETE policies for authenticated.
