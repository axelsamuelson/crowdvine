export type McpAuthMode = "api_key" | "oauth" | "dual";

/**
 * How MCP requests are authenticated.
 * - api_key: shared secret only (MCP_API_KEY), legacy / Cursor static Bearer
 * - oauth: Auth0 JWT only (AUTH0_DOMAIN + AUTH0_AUDIENCE)
 * - dual: accept either valid API key (full tool access) or valid JWT (scope-enforced)
 */
export function getMcpAuthMode(): McpAuthMode {
  const raw = process.env.MCP_AUTH_MODE?.trim().toLowerCase();
  if (raw === "oauth" || raw === "dual") return raw;
  return "api_key";
}

export function oauthConfigReady(): boolean {
  return !!(
    process.env.AUTH0_DOMAIN?.trim() && process.env.AUTH0_AUDIENCE?.trim()
  );
}

export function apiKeyReady(): boolean {
  return !!process.env.MCP_API_KEY?.trim();
}

/** Whether the app should accept MCP traffic at all (503 when false). */
export function mcpAuthIsConfigured(): boolean {
  const mode = getMcpAuthMode();
  if (mode === "api_key") return apiKeyReady();
  if (mode === "oauth") return oauthConfigReady();
  return apiKeyReady() && oauthConfigReady();
}

/** Normalized Auth0 tenant host, e.g. `dev-xxx.eu.auth0.com` */
export function getAuth0Domain(): string {
  const d = process.env.AUTH0_DOMAIN?.trim();
  if (!d) throw new Error("AUTH0_DOMAIN is not set");
  return d.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/** API identifier from Auth0 Dashboard → APIs → your API → Identifier */
export function getAuth0Audience(): string {
  const a = process.env.AUTH0_AUDIENCE?.trim();
  if (!a) throw new Error("AUTH0_AUDIENCE is not set");
  return a;
}

export function auth0IssuerUrl(domain: string): string {
  return `https://${domain}/`;
}

export function auth0JwksUrl(domain: string): string {
  return `https://${domain}/.well-known/jwks.json`;
}
