import { createHash, timingSafeEqual } from "node:crypto";
import { toolRequiresWriteScope } from "./tool-scopes";

/** Env var holding one or more comma-separated static read-only MCP API keys. */
export const PACT_MCP_READONLY_API_KEY_ENV = "PACT_MCP_READONLY_API_KEY";

/**
 * Known `get_gsc_*` tools (documentation / tools/list expectations).
 * Runtime policy is prefix-based via {@link isReadonlyApiKeyAllowedTool} so
 * new GSC tools are covered without widening to non-GSC reads.
 */
export const MCP_READONLY_TOOL_ALLOWLIST: ReadonlySet<string> = new Set([
  "get_gsc_performance",
  "get_gsc_compare",
]);

/** Read-only API-key sessions may only call `get_gsc_*` tools. */
export function isReadonlyApiKeyAllowedTool(name: string): boolean {
  return name.startsWith("get_gsc_");
}

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

function sha256(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

/** Parse non-empty keys from `PACT_MCP_READONLY_API_KEY` (comma-separated). */
export function getReadonlyApiKeysFromEnv(envValue?: string | null): string[] {
  const raw =
    envValue === undefined
      ? process.env[PACT_MCP_READONLY_API_KEY_ENV]
      : envValue;
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
}

export function readonlyApiKeyConfigured(): boolean {
  return getReadonlyApiKeysFromEnv().length > 0;
}

/**
 * Constant-time match of a bearer token against configured read-only keys.
 * Returns false when the env var is unset / empty (path disabled).
 */
export function matchReadonlyApiKey(
  bearerToken: string,
  keys: string[] = getReadonlyApiKeysFromEnv(),
): boolean {
  if (keys.length === 0) return false;
  const tokenDigest = sha256(bearerToken);
  let matched = false;
  for (const key of keys) {
    // Always run timingSafeEqual so early matches do not short-circuit the loop.
    if (timingSafeEqual(tokenDigest, sha256(key))) {
      matched = true;
    }
  }
  return matched;
}

/**
 * Enforce the read-only API-key policy on JSON-RPC before the MCP transport.
 * Write tools and any non-`get_gsc_*` tool → 403.
 *
 * `allowlist` is accepted for call-site compatibility; gating is
 * {@link isReadonlyApiKeyAllowedTool} (prefix `get_gsc_`).
 */
export function checkJsonRpcReadonlyAllowlist(
  body: unknown,
  _allowlist: ReadonlySet<string> = MCP_READONLY_TOOL_ALLOWLIST,
): { ok: true } | { ok: false; message: string } {
  void _allowlist;
  const items = asRpcList(body);

  for (const msg of items) {
    const method = msg.method;
    if (method === "tools/call") {
      const name = msg.params?.name;
      if (typeof name !== "string") continue;
      if (toolRequiresWriteScope(name) || !isReadonlyApiKeyAllowedTool(name)) {
        return {
          ok: false,
          message: `Tool "${name}" is not allowed for read-only API key sessions`,
        };
      }
    }
  }

  return { ok: true };
}

/** Query param names that must never carry credentials for MCP. */
const FORBIDDEN_QUERY_CREDENTIAL_PARAMS = [
  "api_key",
  "key",
  "access_token",
  "token",
  "mcp_api_key",
  "authorization",
  "auth",
] as const;

/**
 * True when the request URL includes a credential-like query parameter.
 * Keys are accepted only via `Authorization: Bearer …`.
 */
export function requestHasQueryCredentials(url: string | URL): boolean {
  const u = typeof url === "string" ? new URL(url) : url;
  for (const name of FORBIDDEN_QUERY_CREDENTIAL_PARAMS) {
    if (u.searchParams.has(name)) return true;
  }
  return false;
}

/** Safe request log: auth type + tool name only — never the key. */
export function logMcpToolAccess(authType: string, body: unknown): void {
  for (const msg of asRpcList(body)) {
    if (msg.method !== "tools/call") continue;
    const tool = msg.params?.name;
    if (typeof tool !== "string") continue;
    console.log("[MCP]", { authType, tool });
  }
}
