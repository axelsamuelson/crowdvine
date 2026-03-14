-- Migration 094: Starwinelist crawler sources – track restaurants and crawl status
-- References menu_documents. Used by menu-extraction crawler.

CREATE TABLE starwinelist_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  slug TEXT NOT NULL UNIQUE,
  name TEXT NULL,
  city TEXT NOT NULL DEFAULT 'stockholm',
  source_url TEXT NOT NULL,

  swl_updated_at TEXT NULL,
  swl_updated_at_parsed TIMESTAMPTZ NULL,

  pdf_url TEXT NULL,
  pdf_last_seen_at TIMESTAMPTZ NULL,

  crawl_status TEXT NOT NULL DEFAULT 'pending',
  last_crawled_at TIMESTAMPTZ NULL,
  last_error TEXT NULL,
  crawl_attempts INTEGER NOT NULL DEFAULT 0,

  latest_document_id UUID NULL REFERENCES menu_documents(id) ON DELETE SET NULL
);

COMMENT ON TABLE starwinelist_sources IS
  'Kända restauranger från Starwinelist med crawl-historik och koppling till extraherade dokument.';
COMMENT ON COLUMN starwinelist_sources.slug IS 'e.g. brasserie-elverket';
COMMENT ON COLUMN starwinelist_sources.source_url IS 'e.g. https://starwinelist.com/wine-place/brasserie-elverket';
COMMENT ON COLUMN starwinelist_sources.swl_updated_at IS 'Raw string from page, e.g. Updated 05 March 2026';
COMMENT ON COLUMN starwinelist_sources.crawl_status IS 'pending | crawling | completed | failed | skipped';

CREATE INDEX idx_starwinelist_sources_slug ON starwinelist_sources(slug);
CREATE INDEX idx_starwinelist_sources_crawl_status ON starwinelist_sources(crawl_status);
CREATE INDEX idx_starwinelist_sources_city ON starwinelist_sources(city);
CREATE INDEX idx_starwinelist_sources_latest_document_id ON starwinelist_sources(latest_document_id) WHERE latest_document_id IS NOT NULL;

ALTER TABLE starwinelist_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage starwinelist_sources" ON starwinelist_sources
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR (profiles.roles IS NOT NULL AND 'admin' = ANY(profiles.roles)))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR (profiles.roles IS NOT NULL AND 'admin' = ANY(profiles.roles)))
    )
  );
