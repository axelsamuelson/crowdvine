-- One-time codes for cross-domain session handoff (pactwines.com <-> dirtywine.se).
-- Codes are created on the source domain and consumed on the target domain; single use, short TTL.
CREATE TABLE IF NOT EXISTS cross_domain_codes (
  code text PRIMARY KEY,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL
);

COMMENT ON TABLE cross_domain_codes IS 'One-time codes for passing Supabase refresh_token between pactwines.com and dirtywine.se. Consumed by /api/auth/accept-session.';

CREATE INDEX IF NOT EXISTS idx_cross_domain_codes_expires_at ON cross_domain_codes (expires_at);

-- Optional: allow cleanup of expired rows (e.g. cron or on-read)
-- DELETE FROM cross_domain_codes WHERE expires_at < now();
