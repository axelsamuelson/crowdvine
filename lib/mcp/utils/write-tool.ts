import type { SupabaseClient } from "@supabase/supabase-js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { logMcpAudit } from "./audit";
import { inferMcpRowCount } from "./payload-metrics";
import { mcpErrorResult, mcpJsonResult } from "./tool-result";

export async function mcpWriteTool<T>(
  sb: SupabaseClient,
  toolName: string,
  params: Record<string, unknown>,
  fn: () => Promise<T>,
): Promise<CallToolResult> {
  try {
    const data = await fn();
    await logMcpAudit(sb, toolName, params, "success");
    return mcpJsonResult(data, {
      tool: toolName,
      rowCount: inferMcpRowCount(data),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logMcpAudit(sb, toolName, params, "error", msg);
    return mcpErrorResult(msg, toolName);
  }
}
