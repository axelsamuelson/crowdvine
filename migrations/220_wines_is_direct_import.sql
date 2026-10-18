-- Flag wines that are available via direct import (B2C/B2B shop category).
-- New wines default to false; backfill existing rows to true.
ALTER TABLE wines
  ADD COLUMN IF NOT EXISTS is_direct_import boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN wines.is_direct_import IS
  'When true, wine appears on direct-import shop category pages.';

UPDATE wines SET is_direct_import = true;
