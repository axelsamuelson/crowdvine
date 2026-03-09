-- Producer live/offline: when false, producer and their wines are hidden from the public website.
ALTER TABLE producers
  ADD COLUMN IF NOT EXISTS is_live BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN producers.is_live IS 'When true, producer and their wines appear on the website. When false, hidden from shop, collections, and search.';
