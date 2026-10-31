-- Exit discount: configurable wine-box exclusions (Meigoon Box until repriced).
-- Clear exclude_from_exit_discount (or remove env IDs) when the box is repriced.

ALTER TABLE public.wine_boxes
  ADD COLUMN IF NOT EXISTS exclude_from_exit_discount boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.wine_boxes.exclude_from_exit_discount IS
  'When true, wines belonging to this box are excluded from the exit-discount base. Turn off after Meigoon Box (or similar) is repriced.';

CREATE INDEX IF NOT EXISTS idx_wine_boxes_exclude_from_exit_discount
  ON public.wine_boxes (id)
  WHERE exclude_from_exit_discount = true;

UPDATE public.wine_boxes
SET exclude_from_exit_discount = true
WHERE handle = 'meigoon-box'
  AND exclude_from_exit_discount IS DISTINCT FROM true;

CREATE INDEX IF NOT EXISTS idx_exit_discount_codes_promo_discount_code_id
  ON public.exit_discount_codes (promo_discount_code_id);

COMMENT ON COLUMN public.exit_discount_codes.email IS
  'Normalized lowercase email the code is bound to; redeeming user email must match.';

COMMENT ON COLUMN public.exit_discount_codes.redeemed_at IS
  'Set when the code is successfully applied at checkout (one-time use).';
