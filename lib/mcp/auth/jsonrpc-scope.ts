import {
  tokenAllowsRead,
  tokenAllowsWrite,
  toolRequiresWriteScope,
} from "./tool-scopes";

type JsonRpcish = {
  method?: string;
  params?: { name?: string; [key: string]: unknown };
};

function asRpcList(body: unknown): JsonRpcish[] {
  if (Array.isArray(body)) {
    return body.filter((x) => x && typeof x === "object") as JsonRpcish[];
  }
  if (body && typeof body === "object" && "method" in body) {
    return [body as JsonRpcish];
  }
  return [];
}

/**
 * Enforce OAuth scopes for JSON-RPC payloads before they hit the MCP transport.
 * API-key mode skips this (full access).
 */
export function checkJsonRpcOAuthScopes(
  body: unknown,
  scopes: Set<string>,
): { ok: true } | { ok: false; message: string } {
  const hasRead = tokenAllowsRead(scopes);
  const hasWrite = tokenAllowsWrite(scopes);
  const items = asRpcList(body);

  for (const msg of items) {
    const method = msg.method;
    if (method === "tools/call") {
      const name = msg.params?.name;
      if (typeof name !== "string") continue;
      if (toolRequiresWriteScope(name)) {
        if (!hasWrite) {
          return {
            ok: false,
            message: `Tool "${name}" requires scope mcp:write`,
          };
        }
      } else if (!hasRead) {
        return {
          ok: false,
          message: `Tool "${name}" requires scope mcp:read (or mcp:write)`,
        };
      }
    } else if (method === "tools/list") {
      if (!hasRead) {
        return {
          ok: false,
          message: "Method tools/list requires scope mcp:read (or mcp:write)",
        };
      }
    } else if (method === "initialize" || method === "notifications/initialized") {
      if (!hasRead && !hasWrite) {
        return {
          ok: false,
          message:
            "MCP session setup requires scope mcp:read or mcp:write on the access token",
        };
      }
    }
  }

  return { ok: true };
}
