ALTER TABLE pallets
  ADD COLUMN IF NOT EXISTS last_mile_cost_cents_per_bottle INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN pallets.last_mile_cost_cents_per_bottle IS
  'Budbee home delivery (last mile) in öre per bottle. 0 = use LAST_MILE_COST_CENTS_PER_BOTTLE env default.';
