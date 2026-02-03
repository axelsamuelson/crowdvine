-- B2B price and stock for wines (B2B customers)
ALTER TABLE wines
  ADD COLUMN IF NOT EXISTS b2b_price_cents INTEGER,
  ADD COLUMN IF NOT EXISTS b2b_stock INTEGER;

COMMENT ON COLUMN wines.b2b_price_cents IS 'Price in öre for B2B customers (optional)';
COMMENT ON COLUMN wines.b2b_stock IS 'Stock quantity reserved/available for B2B (optional)';
