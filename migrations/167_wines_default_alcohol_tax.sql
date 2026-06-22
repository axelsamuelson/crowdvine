-- Backfill standard Swedish alcohol tax (22,19 kr = 2219 öre) for wines missing it.
UPDATE wines
SET alcohol_tax_cents = 2219
WHERE alcohol_tax_cents IS NULL OR alcohol_tax_cents = 0;

COMMENT ON COLUMN wines.alcohol_tax_cents IS 'Alcohol tax per bottle in öre (default 2219 = 22,19 SEK).';
