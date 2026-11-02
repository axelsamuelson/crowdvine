-- Organic registry proof for producers.certification claims.
-- NULL certification_verified_url → public UI must not say Certified/Certifierad.
-- certification_in_conversion → registry proves conversion (C1/C2), not full AB yet.
-- certification_lapsed → organic registry was engaged but is ARRETEE; hide certification
--   chip and show farming copy that certification has lapsed.
-- Data backfill lives in 269_*; do not apply seed writes outside migrations/.

ALTER TABLE public.producers
  ADD COLUMN IF NOT EXISTS certification_verified_url text,
  ADD COLUMN IF NOT EXISTS certification_in_conversion boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS certification_lapsed boolean NOT NULL DEFAULT false;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'producers_certification_verified_url_format'
  ) THEN
    ALTER TABLE public.producers
      ADD CONSTRAINT producers_certification_verified_url_format
      CHECK (
        certification_verified_url IS NULL
        OR certification_verified_url ~* '^https?://[^\s]+$'
      );
  END IF;
END $$;

COMMENT ON COLUMN public.producers.certification_verified_url IS
  'Public organic-registry URL (Agence Bio / Ecocert / Bureau Veritas / Certipaq, etc.). When set, storefront may show Organic Certified or Organic (in conversion) with this link. Does not verify biodynamic Demeter/Biodyvin claims.';

COMMENT ON COLUMN public.producers.certification_in_conversion IS
  'When true with certification_verified_url, label as Organic (in conversion) / Ekologiskt (under omställning) instead of Certified/Certifierad.';

COMMENT ON COLUMN public.producers.certification_lapsed IS
  'When true, organic certification was stopped (e.g. Agence Bio ARRETEE). Hide certification chips; show farming copy that certification has lapsed.';
