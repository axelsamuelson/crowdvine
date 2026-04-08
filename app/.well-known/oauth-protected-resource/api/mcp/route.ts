import { NextResponse } from "next/server";
import { oauthConfigReady } from "@/lib/mcp/auth/mcp-auth-config";
import { buildProtectedResourceMetadata } from "@/lib/mcp/auth/protected-resource-document";
import { mcpResourceIdentifierFromRequest } from "@/lib/mcp/auth/resource-url";

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
 * RFC 9728 Protected Resource Metadata for https://…/api/mcp
 * Path: /.well-known/oauth-protected-resource/api/mcp
 */
export async function GET(req: Request) {
  if (!oauthConfigReady()) {
    return NextResponse.json(
      {
        error:
          "OAuth protected-resource metadata is disabled. Set AUTH0_DOMAIN and AUTH0_AUDIENCE.",
      },
      { status: 503, headers: CORS },
    );
  }

  try {
    const resource = mcpResourceIdentifierFromRequest(req);
    const doc = buildProtectedResourceMetadata(resource);
    return NextResponse.json(doc, {
      headers: {
        "Cache-Control": "public, max-age=300",
        ...CORS,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to build metadata";
    return NextResponse.json({ error: message }, { status: 503, headers: CORS });
  }
}
