import { auth0IssuerUrl, getAuth0Domain } from "./mcp-auth-config";

/**
 * OAuth 2.0 Protected Resource Metadata (RFC 9728) for the MCP HTTP resource.
 */
export function buildProtectedResourceMetadata(resourceIdentifier: string): {
  resource: string;
  authorization_servers: string[];
  scopes_supported: string[];
  bearer_methods_supported: string[];
} {
  const domain = getAuth0Domain();
  const as = auth0IssuerUrl(domain);

  return {
    resource: resourceIdentifier,
    authorization_servers: [as],
    scopes_supported: ["mcp:read", "mcp:write"],
    bearer_methods_supported: ["header"],
  };
}
