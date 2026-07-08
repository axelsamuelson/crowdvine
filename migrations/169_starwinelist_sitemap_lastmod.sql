-- Migration 169: Sitemap lastmod snapshot per source (foundation for snapshot diff)

ALTER TABLE starwinelist_sources
  ADD COLUMN IF NOT EXISTS sitemap_lastmod DATE NULL;

COMMENT ON COLUMN starwinelist_sources.sitemap_lastmod IS
  'Last observed sitemap <lastmod> calendar date for this slug; updated every detect run.';
