-- Migration 210: Track largest Ordervaror partition size per sync run.
-- Idempotent.

ALTER TABLE systembolaget_sync_log
  ADD COLUMN IF NOT EXISTS largest_ordervaror_partition jsonb;

COMMENT ON COLUMN systembolaget_sync_log.largest_ordervaror_partition IS
  'Largest Ordervaror walk partition this run: { key, apiDocCount }. Alert + price-split when apiDocCount > 9000.';
