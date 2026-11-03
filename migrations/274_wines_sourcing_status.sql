-- Whether we can actually buy the wine from the source.
-- Independent of is_live and available_for_sale.

ALTER TABLE wines
  ADD COLUMN IF NOT EXISTS sourcing_status text NOT NULL DEFAULT 'available';

ALTER TABLE wines
  ADD COLUMN IF NOT EXISTS sourcing_note text;

ALTER TABLE wines DROP CONSTRAINT IF EXISTS wines_sourcing_status_chk;

ALTER TABLE wines
  ADD CONSTRAINT wines_sourcing_status_chk
  CHECK (sourcing_status IN ('available', 'allocation', 'unavailable'));

COMMENT ON COLUMN wines.sourcing_status IS
  'Om vi faktiskt kan köpa vinet från källan. available = kan beställas fritt. allocation = endast tilldelning eller på förfrågan. unavailable = vi får inte köpa det (t.ex. för exklusivt hos grossisten). Oberoende av is_live och available_for_sale.';

COMMENT ON COLUMN wines.sourcing_note IS
  'Fritext: varför vinet inte kan köpas, från vem beskedet kom och när.';
