-- B2B margin: use margin % to calculate B2B price (like B2C) instead of direct b2b_price_cents
-- When set, B2B price = (cost + alcohol_tax) / (1 - b2b_margin_percentage/100) exkl. moms

ALTER TABLE wines
  ADD COLUMN IF NOT EXISTS b2b_margin_percentage NUMERIC(5,2);

COMMENT ON COLUMN wines.b2b_margin_percentage IS 'Margin % for B2B price calculation. When set, B2B price is calculated like B2C (cost+alcohol_tax)/(1-margin). Null = use B2C price exkl moms.';
