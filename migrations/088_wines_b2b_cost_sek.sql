-- Store cost in SEK used when B2B price was set in admin, so tasting summary breakdown matches admin exactly.
ALTER TABLE wines ADD COLUMN IF NOT EXISTS b2b_cost_sek NUMERIC(10,2);

COMMENT ON COLUMN wines.b2b_cost_sek IS 'Cost in SEK (cost_amount * exchange_rate) at time B2B price was saved in admin; used for breakdown display.';
