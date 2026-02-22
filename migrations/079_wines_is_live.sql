-- Wines: control visibility in shop (live = visible)
ALTER TABLE wines
  ADD COLUMN IF NOT EXISTS is_live BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN wines.is_live IS 'When true, wine is visible in shop/catalog. When false, hidden from customers.';
