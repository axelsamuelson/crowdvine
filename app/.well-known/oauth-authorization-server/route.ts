import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, accept",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/**
 * OAuth 2.0 Authorization Server Metadata (RFC 8414) for Auth0.
 * URL: /.well-known/oauth-authorization-server
 */
export async function GET() {
  const raw = process.env.AUTH0_DOMAIN?.trim();
  if (!raw) {
    return NextResponse.json(
      { error: "AUTH0_DOMAIN not configured" },
      { status: 503, headers: CORS },
    );
  }

  const domain = raw.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return NextResponse.json(
    {
      issuer: `https://${domain}/`,
      authorization_endpoint: `https://${domain}/authorize`,
      token_endpoint: `https://${domain}/oauth/token`,
      token_endpoint_auth_methods_supported: [
        "client_secret_basic",
        "client_secret_post",
      ],
      jwks_uri: `https://${domain}/.well-known/jwks.json`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      scopes_supported: [
        "openid",
        "profile",
        "email",
        "offline_access",
        "mcp:read",
        "mcp:write",
      ],
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600",
        ...CORS,
      },
    },
  );
}
