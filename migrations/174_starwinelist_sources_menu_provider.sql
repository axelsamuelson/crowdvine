-- Migration 174: Menu provider registry (Starwinelist PDF crawl vs Systemless API sync).

ALTER TABLE starwinelist_sources
  ADD COLUMN IF NOT EXISTS menu_provider TEXT NOT NULL DEFAULT 'starwinelist',
  ADD COLUMN IF NOT EXISTS api_base_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ NULL;

ALTER TABLE starwinelist_sources
  DROP CONSTRAINT IF EXISTS starwinelist_sources_menu_provider_check;

ALTER TABLE starwinelist_sources
  ADD CONSTRAINT starwinelist_sources_menu_provider_check
  CHECK (menu_provider IN ('starwinelist', 'systemless'));

COMMENT ON COLUMN starwinelist_sources.menu_provider IS
  'Ingestion channel: starwinelist (PDF crawl) or systemless (JSON API sync).';
COMMENT ON COLUMN starwinelist_sources.api_base_url IS
  'Base URL for systemless menu API (e.g. flasklista.savantbar.se).';
COMMENT ON COLUMN starwinelist_sources.last_synced_at IS
  'Last successful systemless API sync; do not overload last_crawled_at for these venues.';

UPDATE starwinelist_sources
SET
  menu_provider = 'systemless',
  api_base_url = 'https://flasklista.savantbar.se'
WHERE slug = 'savant-bar-kaffe-and-vin';
