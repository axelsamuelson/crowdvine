-- Ensure every shipping_region with live/saleable wines has at least one
-- accepting pallet (open|consolidating|complete) per SE delivery zone.
-- Idempotent: skips routes that already have an accepting pallet.
-- Fixes the B2C checkout gap where cancelling the sole pallet left
-- Middle Languedoc (af3fb523) with 0 accepting pallets (noPickupForCart).

INSERT INTO public.pallets (
  name,
  shipping_region_id,
  delivery_zone_id,
  pickup_zone_id,
  bottle_capacity,
  min_bottles_to_complete,
  cost_cents,
  status,
  status_mode
)
SELECT
  sr.name || ' to ' || pz.name,
  sr.id,
  pz.id,
  NULL,
  720,
  270,
  50000,
  'open',
  'auto'
FROM public.shipping_regions sr
CROSS JOIN public.pallet_zones pz
WHERE pz.zone_type = 'delivery'
  AND (pz.country_code = 'SE' OR pz.country_code IS NULL)
  AND EXISTS (
    SELECT 1
    FROM public.producers p
    JOIN public.wines w ON w.producer_id = p.id
    WHERE p.shipping_region_id = sr.id
      AND w.is_live = true
      AND COALESCE(w.available_for_sale, true) = true
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.pallets pl
    WHERE pl.shipping_region_id = sr.id
      AND pl.delivery_zone_id = pz.id
      AND pl.status IN ('open', 'consolidating', 'complete')
  );
