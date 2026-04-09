/**
 * Temporary debug logging for MCP auth (remove after fixing 401 / OAuth issues).
 */
export function logMcpAuthDebugRequest(req: Request, rawBearer: string | null): void {
  const auth = req.headers.get("Authorization");
  const tokenPart = auth?.replace(/^Bearer\s+/i, "") ?? "";
  console.log("[MCP Auth Debug]", {
    authMode: process.env.MCP_AUTH_MODE,
    auth0Domain: process.env.AUTH0_DOMAIN ? "***set***" : "***MISSING***",
    auth0Audience: process.env.AUTH0_AUDIENCE || "***MISSING***",
    mcpApiKey: process.env.MCP_API_KEY ? "***set***" : "***MISSING***",
    hasAuthHeader: !!auth,
    authHeaderPrefix: auth ? `${auth.substring(0, 20)}...` : undefined,
    tokenLength: tokenPart.length,
    method: req.method,
  });
}

export function logMcpAuthDebugBearerContext(bearerToken: string | null): void {
  console.log("[MCP Auth Debug] authenticateMcpBearer", {
    authMode: process.env.MCP_AUTH_MODE,
    auth0Domain: process.env.AUTH0_DOMAIN ? "***set***" : "***MISSING***",
    auth0Audience: process.env.AUTH0_AUDIENCE || "***MISSING***",
    mcpApiKey: process.env.MCP_API_KEY ? "***set***" : "***MISSING***",
    hasBearerToken: !!bearerToken,
    tokenLength: bearerToken?.length ?? 0,
  });
}
