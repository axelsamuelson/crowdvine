-- Migration 284: Persist request host + derived site on user_events.
-- site: 'pact' | 'dirtywine' | 'other' (server-derived from Host header).
-- Idempotent; does not change RLS.

ALTER TABLE user_events
  ADD COLUMN IF NOT EXISTS host text;

ALTER TABLE user_events
  ADD COLUMN IF NOT EXISTS site text;

COMMENT ON COLUMN user_events.host IS
  'Request Host header (normalized) at ingest time. Not trusted from the client.';

COMMENT ON COLUMN user_events.site IS
  'Server-derived site from Host: pact | dirtywine | other.';

CREATE INDEX IF NOT EXISTS idx_user_events_site_created_at
  ON user_events (site, created_at DESC);
