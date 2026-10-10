-- Migration 209: Sync run history for Systembolaget assortment mirror.
-- Idempotent. Service role writes; no public access.

CREATE TABLE IF NOT EXISTS systembolaget_sync_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  synced_at timestamptz NOT NULL DEFAULT now(),
  wines integer,
  filter_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  duration_ms integer,
  outcome text NOT NULL
    CONSTRAINT systembolaget_sync_log_outcome_check
    CHECK (outcome IN ('promoted', 'guard_blocked', 'timeout', 'error')),
  old_count integer,
  new_count integer,
  direct_fetched text[] NOT NULL DEFAULT '{}',
  product_numbers text[],
  previous_product_numbers text[],
  error_message text,
  timing jsonb NOT NULL DEFAULT '{}'::jsonb
);

COMMENT ON TABLE systembolaget_sync_log IS
  'One row per Systembolaget sync attempt. product_numbers is the staged/promoted set; previous_product_numbers is the live table before promote so consecutive runs can be diffed.';

CREATE INDEX IF NOT EXISTS idx_sb_sync_log_synced_at
  ON systembolaget_sync_log (synced_at DESC);

ALTER TABLE systembolaget_sync_log ENABLE ROW LEVEL SECURITY;

-- No public policies: service role only.
