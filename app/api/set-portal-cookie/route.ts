import { NextRequest, NextResponse } from "next/server";

const PACT_ORIGIN = "https://pactwines.com";
const COOKIE_NAME = "dirtywine_redirect_shown";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * GET /api/set-portal-cookie?next=/
 * Sets the dirtywine_redirect_shown cookie and redirects to pactwines.com/portal-redirect.
 * Used when user on dirtywine.se has no business access - we set the cookie on the same
 * domain first (so it persists), then redirect to show the message.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const next = searchParams.get("next") || "/";

  const portalRedirect = new URL("/portal-redirect", PACT_ORIGIN);
  portalRedirect.searchParams.set("from", "dirtywine");
  portalRedirect.searchParams.set("next", next);

  const response = NextResponse.redirect(portalRedirect);
  response.cookies.set(COOKIE_NAME, "1", {
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  return response;
}
