-- Before/after snapshots for MCP write audit (Lager & Frakt and other write tools)

ALTER TABLE mcp_audit_log
  ADD COLUMN IF NOT EXISTS before_state JSONB,
  ADD COLUMN IF NOT EXISTS after_state JSONB;

COMMENT ON COLUMN mcp_audit_log.before_state IS 'JSON snapshot before a successful/failed MCP write (when available).';
COMMENT ON COLUMN mcp_audit_log.after_state IS 'JSON snapshot after a successful MCP write (when available).';
