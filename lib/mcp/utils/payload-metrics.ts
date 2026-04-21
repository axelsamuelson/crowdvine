/**
 * Structured logs for MCP tool response sizes (chars + rough token estimate).
 * Parse logs with prefix `[mcp_payload]` in your log pipeline.
 */

export type McpPayloadMetricLog = {
  type: "mcp_payload";
  tool: string;
  ok: boolean;
  response_chars: number;
  /** Rough input-token estimate (not official Anthropic usage). */
  estimated_tokens: number;
  row_count?: number;
  ts: string;
};

/** ~4 chars per token for Latin/JSON (rough heuristic). */
const CHARS_PER_TOKEN_ESTIMATE = 4;

export function estimateTokensFromChars(charCount: number): number {
  return Math.ceil(charCount / CHARS_PER_TOKEN_ESTIMATE);
}

export function logMcpToolPayloadMetrics(opts: {
  tool: string;
  ok: boolean;
  responseChars: number;
  rowCount?: number;
}): void {
  const payload: McpPayloadMetricLog = {
    type: "mcp_payload",
    tool: opts.tool,
    ok: opts.ok,
    response_chars: opts.responseChars,
    estimated_tokens: estimateTokensFromChars(opts.responseChars),
    ts: new Date().toISOString(),
  };
  if (opts.rowCount !== undefined) payload.row_count = opts.rowCount;
  console.log(`[mcp_payload] ${JSON.stringify(payload)}`);
}

/** Best-effort row count for logs when not passed explicitly. */
export function inferMcpRowCount(data: unknown): number | undefined {
  if (data === null || data === undefined) return undefined;
  if (Array.isArray(data)) return data.length;
  if (typeof data !== "object") return undefined;
  const o = data as Record<string, unknown>;
  if (Array.isArray(o.tasks)) return o.tasks.length;
  if (Array.isArray(o.goals)) return o.goals.length;
  if (Array.isArray(o.objectives)) return o.objectives.length;
  if (Array.isArray(o.projects)) return o.projects.length;
  if (Array.isArray(o.metrics)) return o.metrics.length;
  if (Array.isArray(o.created)) return o.created.length;
  if (o.ok === true && Array.isArray(o.updated_task_ids))
    return o.updated_task_ids.length;
  return undefined;
}
