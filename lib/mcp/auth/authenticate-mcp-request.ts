import {
  getMcpAuthMode,
  oauthConfigReady,
} from "./mcp-auth-config";
import { logMcpAuthDebugBearerContext } from "./mcp-auth-debug";
import {
  matchReadonlyApiKey,
  MCP_READONLY_TOOL_ALLOWLIST,
} from "./readonly-api-key";
import { verifyAuth0AccessToken } from "./verify-access-token";

export type McpAuthType = "api_key" | "oauth" | "readonly_api_key";

export type McpAuthenticatedContext = {
  /** Stable key for rate limiting (never log raw API keys). */
  rateLimitKey: string;
  /** Set when the caller used an Auth0 access token; null for shared-secret modes. */
  oauthScopes: Set<string> | null;
  /** How the request was authenticated (safe to log). */
  authType: McpAuthType;
  /**
   * When set, the session may only use these tools (read-only API key).
   * Null means full tool surface subject to OAuth scopes / shared API key.
   */
  toolAllowlist: ReadonlySet<string> | null;
};

export type AuthenticateMcpBearerResult =
  | { ok: true; ctx: McpAuthenticatedContext }
  | { ok: false; reason: "missing" | "invalid"; message: string };

export async function authenticateMcpBearer(
  bearerToken: string | null,
): Promise<AuthenticateMcpBearerResult> {
  logMcpAuthDebugBearerContext(bearerToken);

  const mode = getMcpAuthMode();

  if (!bearerToken) {
    return { ok: false, reason: "missing", message: "Bearer token missing" };
  }

  // Static read-only key (PACT_MCP_READONLY_API_KEY) — header Bearer only.
  // Checked in every MCP_AUTH_MODE when the env var is configured.
  if (matchReadonlyApiKey(bearerToken)) {
    return {
      ok: true,
      ctx: {
        rateLimitKey: `ro:${hashKey(bearerToken)}`,
        oauthScopes: null,
        authType: "readonly_api_key",
        toolAllowlist: MCP_READONLY_TOOL_ALLOWLIST,
      },
    };
  }

  if (mode === "api_key") {
    const expected = process.env.MCP_API_KEY?.trim();
    if (!expected || bearerToken !== expected) {
      return {
        ok: false,
        reason: "invalid",
        message: "Bearer token does not match MCP_API_KEY",
      };
    }
    return {
      ok: true,
      ctx: {
        rateLimitKey: `k:${hashKey(bearerToken)}`,
        oauthScopes: null,
        authType: "api_key",
        toolAllowlist: null,
      },
    };
  }

  if (mode === "oauth") {
    const v = await verifyAuth0AccessToken(bearerToken);
    if (!v.ok) {
      return {
        ok: false,
        reason: "invalid",
        message: v.message,
      };
    }
    return {
      ok: true,
      ctx: {
        rateLimitKey: `jwt:${v.token.sub}`,
        oauthScopes: v.token.scopes,
        authType: "oauth",
        toolAllowlist: null,
      },
    };
  }

  const expected = process.env.MCP_API_KEY?.trim();
  if (expected && bearerToken === expected) {
    return {
      ok: true,
      ctx: {
        rateLimitKey: `k:${hashKey(bearerToken)}`,
        oauthScopes: null,
        authType: "api_key",
        toolAllowlist: null,
      },
    };
  }

  if (!oauthConfigReady()) {
    return {
      ok: false,
      reason: "invalid",
      message:
        "Dual mode: token is not MCP_API_KEY and OAuth is not configured (AUTH0_DOMAIN + AUTH0_AUDIENCE)",
    };
  }

  const v = await verifyAuth0AccessToken(bearerToken);
  if (!v.ok) {
    return { ok: false, reason: "invalid", message: v.message };
  }
  return {
    ok: true,
    ctx: {
      rateLimitKey: `jwt:${v.token.sub}`,
      oauthScopes: v.token.scopes,
      authType: "oauth",
      toolAllowlist: null,
    },
  };
}

function hashKey(secret: string): string {
  let h = 0;
  for (let i = 0; i < secret.length; i++) {
    h = (Math.imul(31, h) + secret.charCodeAt(i)) | 0;
  }
  return `${h.toString(16)}:${secret.length}`;
}
