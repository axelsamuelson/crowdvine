import {
  getMcpAuthMode,
  oauthConfigReady,
} from "./mcp-auth-config";
import { verifyAuth0AccessToken } from "./verify-access-token";

export type McpAuthenticatedContext = {
  /** Stable key for rate limiting (never log raw API keys). */
  rateLimitKey: string;
  /** Set when the caller used an Auth0 access token; null for shared-secret mode. */
  oauthScopes: Set<string> | null;
};

export type AuthenticateMcpBearerResult =
  | { ok: true; ctx: McpAuthenticatedContext }
  | { ok: false; reason: "missing" | "invalid"; message: string };

export async function authenticateMcpBearer(
  bearerToken: string | null,
): Promise<AuthenticateMcpBearerResult> {
  const mode = getMcpAuthMode();

  if (!bearerToken) {
    return { ok: false, reason: "missing", message: "Bearer token missing" };
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
      ctx: { rateLimitKey: `k:${hashKey(bearerToken)}`, oauthScopes: null },
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
      },
    };
  }

  const expected = process.env.MCP_API_KEY?.trim();
  if (expected && bearerToken === expected) {
    return {
      ok: true,
      ctx: { rateLimitKey: `k:${hashKey(bearerToken)}`, oauthScopes: null },
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
