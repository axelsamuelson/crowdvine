-- Optional name for producer page title and H1. Never used for the slug.

ALTER TABLE producers
  ADD COLUMN IF NOT EXISTS display_name text;

COMMENT ON COLUMN producers.display_name IS
  'Name shown in title and H1 when it differs from the legal or estate name, e.g. the winemaker people search for. Never used for the slug.';
