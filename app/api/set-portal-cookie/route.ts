import { NextRequest, NextResponse } from "next/server";

const PACT_ORIGIN = "https://pactwines.com";
const COOKIE_NAME = "dirtywine_redirect_shown";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function setCookie(response: NextResponse, forCrossOrigin = false) {
  response.cookies.set(COOKIE_NAME, "1", {
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    secure: forCrossOrigin || process.env.NODE_ENV === "production",
    sameSite: forCrossOrigin ? "none" : "lax",
  });
}

/**
 * GET /api/set-portal-cookie?next=/&silent=1
 * - silent=1: set cookie only, return 204 (called from portal-redirect page on pactwines.com)
 * - no silent: set cookie and redirect to pactwines.com/portal-redirect (legacy flow)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const next = searchParams.get("next") || "/";
  const silent = searchParams.get("silent") === "1";

  if (silent) {
    // 1x1 transparent GIF so img.src works; SameSite=None allows cross-origin cookie set
    const gif = Buffer.from(
      "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      "base64",
    );
    const response = new NextResponse(gif, {
      status: 200,
      headers: { "Content-Type": "image/gif" },
    });
    setCookie(response, true);
    return response;
  }

  const portalRedirect = new URL("/portal-redirect", PACT_ORIGIN);
  portalRedirect.searchParams.set("from", "dirtywine");
  portalRedirect.searchParams.set("next", next);

  const response = NextResponse.redirect(portalRedirect);
  setCookie(response);
  return response;
}
