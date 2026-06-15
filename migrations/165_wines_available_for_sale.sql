-- B2C: wine can be visible (is_live) but not purchasable (available_for_sale = false).
ALTER TABLE wines
  ADD COLUMN IF NOT EXISTS available_for_sale BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN wines.available_for_sale IS
  'When true, customers can add the wine to cart (subject to B2B stock on dirtywine.se). When false, wine may still be visible on PDP/shop but is sold out.';
