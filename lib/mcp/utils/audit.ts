import type { SupabaseClient } from "@supabase/supabase-js";

export type McpAuditStates = {
  before?: unknown;
  after?: unknown;
};

export async function logMcpAudit(
  sb: SupabaseClient,
  toolName: string,
  parameters: Record<string, unknown> | undefined,
  resultStatus: "success" | "error",
  errorMessage?: string,
  states?: McpAuditStates,
): Promise<void> {
  try {
    await sb.from("mcp_audit_log").insert({
      tool_name: toolName,
      parameters: parameters ?? null,
      result_status: resultStatus,
      error_message: errorMessage ?? null,
      before_state: states?.before ?? null,
      after_state: states?.after ?? null,
    });
  } catch {
    // Avoid breaking MCP flow if audit table/columns are missing in an old env
  }
}
