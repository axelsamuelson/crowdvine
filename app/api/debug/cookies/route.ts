import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const cookies = request.cookies.getAll();

  const cookieInfo = cookies.map((cookie) => ({
    name: cookie.name,
    value: cookie.value.substring(0, 20) + "...",
    hasValue: !!cookie.value,
    length: cookie.value.length,
  }));

  return NextResponse.json({
    totalCookies: cookies.length,
    cookies: cookieInfo,
    hasSupabaseAuth: cookies.some(
      (c) =>
        c.name.includes("sb-") ||
        c.name.includes("supabase") ||
        c.name.includes("auth"),
    ),
    hasAccessCookie: cookies.some((c) => c.name === "cv-access"),
    userAgent: request.headers.get("user-agent"),
    isIncognito:
      request.headers.get("user-agent")?.includes("Incognito") || false,
  });
}
