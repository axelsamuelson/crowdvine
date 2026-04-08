import type { SupabaseClient } from "@supabase/supabase-js";

export async function logMcpAudit(
  sb: SupabaseClient,
  toolName: string,
  parameters: Record<string, unknown> | undefined,
  resultStatus: "success" | "error",
  errorMessage?: string,
): Promise<void> {
  try {
    await sb.from("mcp_audit_log").insert({
      tool_name: toolName,
      parameters: parameters ?? null,
      result_status: resultStatus,
      error_message: errorMessage ?? null,
    });
  } catch {
    // Avoid breaking MCP flow if audit table is missing in an old env
  }
}
