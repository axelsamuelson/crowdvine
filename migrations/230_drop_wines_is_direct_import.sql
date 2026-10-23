-- Revert wines.is_direct_import (direct-import shop pages are redirected away).
ALTER TABLE wines DROP COLUMN IF EXISTS is_direct_import;
