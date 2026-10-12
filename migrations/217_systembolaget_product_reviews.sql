-- Separate review ledger for "looked at, not listed" (and pending).
-- Does not change systembolaget_curated verdict constraints.

CREATE TABLE IF NOT EXISTS systembolaget_product_reviews (
  product_number text PRIMARY KEY,
  status text NOT NULL,
  reason_sv text,
  reason_en text,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by text,
  CONSTRAINT systembolaget_product_reviews_status_check
    CHECK (status = ANY (ARRAY['skipped'::text, 'pending'::text]))
);

COMMENT ON TABLE systembolaget_product_reviews IS
  'Admin review decisions for Systembolaget products that are not curated list entries.';

ALTER TABLE systembolaget_product_reviews ENABLE ROW LEVEL SECURITY;

-- No public SELECT policy: service role / admin only (same write stance as staging).

GRANT SELECT ON systembolaget_product_reviews TO authenticated;

ALTER TABLE systembolaget_sync_log
  ADD COLUMN IF NOT EXISTS coverage_gap_count integer,
  ADD COLUMN IF NOT EXISTS missing_in_mirror_count integer;

COMMENT ON COLUMN systembolaget_sync_log.coverage_gap_count IS
  'Available mirrored top-producer bottles with no curated row and no product review.';
COMMENT ON COLUMN systembolaget_sync_log.missing_in_mirror_count IS
  'API bottles for mapped producers that were missing from the mirror after this sync.';
