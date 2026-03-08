-- Wine specification fields for PDP bullet list. Region comes from producers.region.
ALTER TABLE wines ADD COLUMN IF NOT EXISTS appellation text;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS terroir text;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS vinification text;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS abv text;

COMMENT ON COLUMN wines.appellation IS 'Appellation e.g. Vin de France';
COMMENT ON COLUMN wines.terroir IS 'Terroir/soil e.g. Schist';
COMMENT ON COLUMN wines.vinification IS 'Vinification note e.g. 60 days skin contact';
COMMENT ON COLUMN wines.abv IS 'Alcohol by volume e.g. 13%';
