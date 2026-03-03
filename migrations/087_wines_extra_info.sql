-- Add optional wine info fields for admin/wines (terroir, production, tasting, classification, alcohol %, etc.)
-- Only adds columns that do not exist.

ALTER TABLE wines ADD COLUMN IF NOT EXISTS terroir_soil TEXT;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS production_method TEXT;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS tasting_profile_character TEXT;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS classification TEXT;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS tasting_notes TEXT;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS alcohol_percentage NUMERIC(4,2);

COMMENT ON COLUMN wines.terroir_soil IS 'Terroir & soil description';
COMMENT ON COLUMN wines.production_method IS 'Production method';
COMMENT ON COLUMN wines.tasting_profile_character IS 'Tasting profile & character';
COMMENT ON COLUMN wines.classification IS 'Classification (e.g. AOP, IGP)';
COMMENT ON COLUMN wines.tasting_notes IS 'Tasting notes';
COMMENT ON COLUMN wines.alcohol_percentage IS 'Alcohol by volume (e.g. 13.5 for 13.5%)';
