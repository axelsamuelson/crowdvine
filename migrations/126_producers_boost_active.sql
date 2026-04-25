-- Producer boost: PACT Points redeem at 2× SEK value against this producer's wines (capped by order rules in app).
-- Date: 2026-04-25

ALTER TABLE producers
  ADD COLUMN IF NOT EXISTS boost_active BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_producers_boost_active
  ON producers(boost_active)
  WHERE boost_active = true;

COMMENT ON COLUMN producers.boost_active IS
  'When true, PACT Points redeemed against this producer''s wines are worth 2x at checkout.';
