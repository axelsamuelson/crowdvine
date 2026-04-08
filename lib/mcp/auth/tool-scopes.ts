/**
 * Mutating MCP tools require `mcp:write`. Everything else requires `mcp:read`
 * (or `mcp:write`, which implies read access for authorization checks).
 */
const WRITE_TOOLS = new Set<string>([
  "create_goal",
  "update_goal",
  "delete_goal",
  "create_objective",
  "update_objective",
  "delete_objective",
  "create_project",
  "update_project",
  "delete_project",
  "create_task",
  "update_task",
  "delete_task",
  "batch_create_tasks",
]);

/** @returns true if the tool mutates data and needs mcp:write */
export function toolRequiresWriteScope(toolName: string): boolean {
  return WRITE_TOOLS.has(toolName);
}

export function tokenAllowsRead(scopes: Set<string>): boolean {
  return scopes.has("mcp:read") || scopes.has("mcp:write");
}

export function tokenAllowsWrite(scopes: Set<string>): boolean {
  return scopes.has("mcp:write");
}
