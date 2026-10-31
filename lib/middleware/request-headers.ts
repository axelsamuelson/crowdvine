import type { NextRequest } from "next/server";
import { isDirtywineHost } from "@/lib/b2b-site";
import { localeFromShopPath } from "@/lib/i18n/shop-path-locale";

/** Forwarded on every NextResponse.next so layouts/pages can avoid headers() when static. */
export const PACT_PATHNAME_HEADER = "x-pathname";
export const PACT_SEARCH_HEADER = "x-search";
export const PACT_LOCALE_HEADER = "x-pact-locale";
/** `pact` | `dirtywine` — host-derived site key for dual-brand rendering. */
export const PACT_SITE_HEADER = "x-pact-site";

export type PactSiteKey = "pact" | "dirtywine";

export function resolvePactSiteKey(
  host: string | null,
  searchParams?: URLSearchParams | null,
): PactSiteKey {
  return isDirtywineHost(host, searchParams) ? "dirtywine" : "pact";
}

/**
 * Request headers for the Next.js app (pathname / locale / site).
 * Call from middleware on every `NextResponse.next` path so RSC can stay static
 * when it does not read `headers()` / `cookies()`.
 */
export function buildPactRequestHeaders(req: NextRequest): Headers {
  const pathname = req.nextUrl.pathname;
  const headers = new Headers(req.headers);
  headers.set(PACT_PATHNAME_HEADER, pathname);
  headers.set(PACT_SEARCH_HEADER, req.nextUrl.search);

  const pathLocale = localeFromShopPath(pathname);
  if (pathLocale) {
    headers.set(PACT_LOCALE_HEADER, pathLocale);
  }

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  headers.set(
    PACT_SITE_HEADER,
    resolvePactSiteKey(host, req.nextUrl.searchParams),
  );

  return headers;
}
