-- Migration 170: Persistent alert suppression (chronic vs transient)

CREATE TABLE IF NOT EXISTS menu_pipeline_alert_state (
  alert_key TEXT PRIMARY KEY,
  fingerprint TEXT NOT NULL,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  send_count INTEGER NOT NULL DEFAULT 1
);

COMMENT ON TABLE menu_pipeline_alert_state IS
  'Tracks last-sent fingerprint per alert key. Chronic alerts suppress repeats until fingerprint changes or condition clears.';
