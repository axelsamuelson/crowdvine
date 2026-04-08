-- MCP remote connector audit trail (writes only, from app code)

CREATE TABLE mcp_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_name TEXT NOT NULL,
  parameters JSONB,
  result_status TEXT NOT NULL CHECK (result_status IN ('success', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mcp_audit_log_created_at ON mcp_audit_log(created_at DESC);
CREATE INDEX idx_mcp_audit_log_tool_name ON mcp_audit_log(tool_name);

COMMENT ON TABLE mcp_audit_log IS 'Audit log for MCP tool write operations (PACT OKR connector).';

ALTER TABLE mcp_audit_log ENABLE ROW LEVEL SECURITY;
