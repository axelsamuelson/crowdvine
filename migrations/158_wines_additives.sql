ALTER TABLE wines ADD COLUMN IF NOT EXISTS additives text;

COMMENT ON COLUMN wines.additives IS 'Free-text additives / tillsatser note for PDP Odling & Tillsatser spec';
