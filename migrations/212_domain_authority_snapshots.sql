-- Migration 212: Weekly domain-authority snapshots (Open PageRank + GSC + sitemap).
-- Idempotent. Service role writes; no public access.

CREATE TABLE IF NOT EXISTS domain_authority_snapshots (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  domain text NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  snapshot_date date NOT NULL DEFAULT ((timezone('utc', now()))::date),
  open_page_rank numeric(4, 2),
  global_rank integer,
  referring_domains integer,
  gsc_clicks_28d integer,
  gsc_impressions_28d integer,
  gsc_ctr_28d numeric(8, 6),
  gsc_position_28d numeric(8, 3),
  sitemap_url_count integer,
  authority_score numeric(5, 2) NOT NULL,
  components jsonb NOT NULL DEFAULT '{}'::jsonb,
  sources jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT domain_authority_snapshots_domain_date_unique
    UNIQUE (domain, snapshot_date)
);

COMMENT ON TABLE domain_authority_snapshots IS
  'Internal DA-like score history per domain. Not Moz Domain Authority — composite of Open PageRank, GSC, sitemap size.';

CREATE INDEX IF NOT EXISTS idx_domain_authority_snapshots_domain_date
  ON domain_authority_snapshots (domain, snapshot_date DESC);

ALTER TABLE domain_authority_snapshots ENABLE ROW LEVEL SECURITY;
-- No public policies: service role only.
