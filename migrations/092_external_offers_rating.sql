-- Rating from competitor source (e.g. Vivino 0–5 scale). Null when not provided.
ALTER TABLE external_offers
  ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 2);

COMMENT ON COLUMN external_offers.rating IS 'Rating from source (e.g. Vivino 0–5). Null if not available.';
