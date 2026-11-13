import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { LOCALE_COOKIE } from "@/lib/i18n/locale";
import { resolveRequestUiLocale } from "@/lib/i18n/request-ui-locale";
import { resolveShoppingContext } from "@/lib/shopping-context/resolve";

/**
 * GET /api/shopping-context — resolved locale, currency, market, active geo zone.
 * Works for guests (default zone) and signed-in users.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const host = request.headers.get("host");
    const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value ?? null;
    const referer = request.headers.get("referer");
    let pathLocale = resolveRequestUiLocale(
      request.nextUrl.pathname,
      request.nextUrl.searchParams,
    ).uiLocale;
    if (!pathLocale && referer) {
      try {
        const ref = new URL(referer);
        pathLocale = resolveRequestUiLocale(ref.pathname, ref.search).uiLocale;
      } catch {
        /* ignore malformed referer */
      }
    }

    const shoppingContext = await resolveShoppingContext({
      userId: user?.id ?? null,
      host,
      searchParams: request.nextUrl.searchParams,
      cookieLocale,
      acceptLanguage: request.headers.get("accept-language"),
      pathLocale,
    });

    return NextResponse.json({ shoppingContext });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
