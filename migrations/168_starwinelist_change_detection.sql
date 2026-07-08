-- Migration 168: Change detection columns for Starwinelist crawl rotation + alert dedup

ALTER TABLE starwinelist_sources
  ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS crawl_priority INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN starwinelist_sources.last_checked_at IS
  'Last time venue HTML was fetched (including fast-skip without PDF download).';
COMMENT ON COLUMN starwinelist_sources.crawl_priority IS
  'Higher values are crawled first (widget feed sets 100).';

CREATE INDEX IF NOT EXISTS idx_starwinelist_sources_crawl_rotation
  ON starwinelist_sources (city, crawl_priority DESC, last_checked_at ASC NULLS FIRST)
  WHERE crawl_status <> 'crawling';

CREATE TABLE IF NOT EXISTS menu_pipeline_alert_dedup (
  alert_key TEXT PRIMARY KEY,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE menu_pipeline_alert_dedup IS
  'Once-per-day (or similar) dedup keys for menu pipeline Slack alerts.';
