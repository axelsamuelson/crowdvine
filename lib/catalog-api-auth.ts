import { NextRequest, NextResponse } from "next/server";

/** Catalog write/read API: same secret as MCP Bearer (MCP_API_KEY). */
export function requireCatalogApiAuth(
  request: NextRequest,
): NextResponse | null {
  const expected = process.env.MCP_API_KEY?.trim();
  if (!expected) {
    return NextResponse.json(
      { error: "Catalog API is not configured (MCP_API_KEY missing)" },
      { status: 503 },
    );
  }

  const header = request.headers.get("authorization");
  const token =
    header?.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : null;

  if (!token || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
