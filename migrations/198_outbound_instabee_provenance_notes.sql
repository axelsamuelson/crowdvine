-- Migration 198: Document Instabee Home provenance; do NOT invent WINE_BOX_6 dims.
-- Date: 2026-08-15
--
-- Packaging dimensions/tare remain NULL until authoritative supplier/measured
-- values exist. Volumetric factor 280 is retained as a CONFIGURABLE ASSUMPTION
-- (Locker-section evidence in source PDF) — not verified for Home Delivery.

UPDATE packaging_profiles
SET
  notes = 'WINE_BOX_6 placeholder. Outer L×W×H and tare_weight_kg MUST come from packaging supplier spec or PACT measurement. Do not invent. Until set, outbound quotes stay INCOMPLETE (not 0 SEK).',
  updated_at = NOW()
WHERE code = 'WINE_BOX_6'
  AND length_m IS NULL
  AND width_m IS NULL
  AND height_m IS NULL;

UPDATE freight_rates fr
SET
  notes = 'Budbee Light Home SE: 79 SEK first 0.5 volumetric kg + 1 SEK/0.5 kg. Offer valid_to 2026-08-18 inclusive. volumetric_factor=280 is ASSUMPTION (Locker section in source PDF) — not independently verified for Home. Tax/VAT basis UNKNOWN. Do not apply Locker max dimensions to Home.',
  updated_at = NOW()
FROM freight_services fs
JOIN logistics_providers lp ON lp.id = fs.provider_id
WHERE fr.freight_service_id = fs.id
  AND lp.code = 'INSTABEE'
  AND fs.direction = 'OUTBOUND'
  AND fs.name ILIKE '%Budbee Light%'
  AND fr.currency = 'SEK'
  AND fr.base_price_amount = 79;
