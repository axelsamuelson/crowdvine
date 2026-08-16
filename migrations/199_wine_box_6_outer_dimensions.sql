-- Migration 199: Set WINE_BOX_6 outer dimensions from ops-provided carton size.
-- Date: 2026-08-15
--
-- Source: PACT ops — outer carton L×W×H = 264 × 171 × 335 mm.
-- Units in packaging_profiles are meters. tare_weight_kg still UNKNOWN (left NULL).
-- Does not change live 120-bottle readiness or customer shipping.

UPDATE packaging_profiles
SET
  length_m = 0.264,
  width_m = 0.171,
  height_m = 0.335,
  notes = 'Outer carton L×W×H = 264×171×335 mm (ops-provided 2026-08-15). Stored as 0.264×0.171×0.335 m. tare_weight_kg still unknown — not required for current VOLUMETRIC_WEIGHT Instabee basis.',
  updated_at = NOW()
WHERE code = 'WINE_BOX_6';
