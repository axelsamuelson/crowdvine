/**
 * Canonical protected resource URI for this MCP deployment (RFC 8693 resource, RFC 9728).
 * Override when the public URL differs from the incoming request (e.g. custom domains).
 */
export function mcpResourceIdentifierFromRequest(req: Request): string {
  const env = process.env.MCP_RESOURCE_IDENTIFIER?.trim();
  if (env) return env;

  const url = new URL(req.url);
  const host =
    req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ?? url.host;
  const forwardedProto = req.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const proto =
    forwardedProto ||
    url.protocol.replace(":", "") ||
    "https";

  return `${proto}://${host}/api/mcp`;
}

/** RFC 9728 well-known URL for this resource's metadata document. */
export function protectedResourceMetadataUrl(
  resourceIdentifier: string,
): string {
  const u = new URL(resourceIdentifier);
  const path = u.pathname.endsWith("/") ? u.pathname.slice(0, -1) : u.pathname;
  return `${u.origin}/.well-known/oauth-protected-resource${path}`;
}

export function protectedResourceMetadataUrlFromRequest(req: Request): string {
  return protectedResourceMetadataUrl(mcpResourceIdentifierFromRequest(req));
}
