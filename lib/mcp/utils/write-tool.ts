import type { SupabaseClient } from "@supabase/supabase-js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { logMcpAudit } from "./audit";
import { inferMcpRowCount } from "./payload-metrics";
import { mcpErrorResult, mcpJsonResult } from "./tool-result";

export type McpWriteToolOptions = {
  /** Load entity snapshot before mutation (for audit + before/after response). */
  loadBefore?: () => Promise<unknown>;
};

/**
 * Run a mutating MCP tool: optional before snapshot, execute fn, audit with
 * before/after, return JSON including before/after when a before loader ran.
 */
export async function mcpWriteTool<T>(
  sb: SupabaseClient,
  toolName: string,
  params: Record<string, unknown>,
  fn: () => Promise<T>,
  opts?: McpWriteToolOptions,
): Promise<CallToolResult> {
  let before: unknown = undefined;
  try {
    if (opts?.loadBefore) {
      before = await opts.loadBefore();
    }
    const data = await fn();
    await logMcpAudit(sb, toolName, params, "success", undefined, {
      before,
      after: data,
    });
    const payload =
      opts?.loadBefore !== undefined
        ? { before, after: data, result: data }
        : data;
    return mcpJsonResult(payload, {
      tool: toolName,
      rowCount: inferMcpRowCount(data),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logMcpAudit(sb, toolName, params, "error", msg, { before });
    return mcpErrorResult(msg, toolName);
  }
}

/** Require confirm:true when any of the given param keys are present (or always). */
export function requireConfirm(
  params: Record<string, unknown>,
  opts: { always?: boolean; whenPresent?: string[]; label?: string },
): void {
  const needs =
    opts.always === true ||
    (opts.whenPresent ?? []).some(
      (k) => params[k] !== undefined && params[k] !== null,
    );
  if (!needs) return;
  if (params.confirm === true) return;
  const label = opts.label ?? "This change";
  throw new Error(
    `${label} requires confirm: true (customer- or checkout-impacting).`,
  );
}
