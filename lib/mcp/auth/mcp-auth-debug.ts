/**
 * Temporary debug logging for MCP auth (remove after fixing 401 / OAuth issues).
 * Never log bearer tokens or API keys — lengths and presence only.
 */
export function logMcpAuthDebugRequest(req: Request, rawBearer: string | null): void {
  const auth = req.headers.get("Authorization");
  console.log("[MCP Auth Debug]", {
    authMode: process.env.MCP_AUTH_MODE,
    auth0Domain: process.env.AUTH0_DOMAIN ? "***set***" : "***MISSING***",
    auth0Audience: process.env.AUTH0_AUDIENCE ? "***set***" : "***MISSING***",
    mcpApiKey: process.env.MCP_API_KEY ? "***set***" : "***MISSING***",
    readonlyApiKey: process.env.PACT_MCP_READONLY_API_KEY
      ? "***set***"
      : "***MISSING***",
    hasAuthHeader: !!auth,
    hasBearerScheme: !!auth?.toLowerCase().startsWith("bearer "),
    tokenLength: rawBearer?.length ?? 0,
    method: req.method,
  });
}

export function logMcpAuthDebugBearerContext(bearerToken: string | null): void {
  console.log("[MCP Auth Debug] authenticateMcpBearer", {
    authMode: process.env.MCP_AUTH_MODE,
    auth0Domain: process.env.AUTH0_DOMAIN ? "***set***" : "***MISSING***",
    auth0Audience: process.env.AUTH0_AUDIENCE ? "***set***" : "***MISSING***",
    mcpApiKey: process.env.MCP_API_KEY ? "***set***" : "***MISSING***",
    readonlyApiKey: process.env.PACT_MCP_READONLY_API_KEY
      ? "***set***"
      : "***MISSING***",
    hasBearerToken: !!bearerToken,
    tokenLength: bearerToken?.length ?? 0,
  });
}
