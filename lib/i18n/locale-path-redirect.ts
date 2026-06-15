import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import type { AppLocale } from "@/lib/i18n/locale";
import { LOCALE_COOKIE, parseLocaleCookie } from "@/lib/i18n/locale";
import {
  producerPagePath,
  productPagePath,
  type ProducerPathSegment,
  type ProductPathSegment,
} from "@/lib/i18n/localized-routes";
import { localeFromShopPath } from "@/lib/i18n/shop-path-locale";

/** Producer portal routes under /producer — not public slug pages. */
const PRODUCER_PORTAL_SEGMENTS = new Set([
  "wines",
  "labels",
  "profile",
  "settings",
  "orders",
]);

export function isPublicProductPath(pathname: string): boolean {
  return /^\/(product|produkt)\/[^/?#]+\/?$/.test(pathname);
}

export function isPublicProducerSlugPath(pathname: string): boolean {
  const match = pathname.match(/^\/(producer|producent)\/([^/?#]+)\/?$/);
  if (!match) return false;
  return !PRODUCER_PORTAL_SEGMENTS.has(match[2]);
}

function preferredLocaleFromRequest(req: NextRequest): AppLocale | null {
  const fromCookie = parseLocaleCookie(req.cookies.get(LOCALE_COOKIE)?.value);
  if (fromCookie) return fromCookie;

  const referer = req.headers.get("referer");
  if (!referer) return null;
  try {
    return localeFromShopPath(new URL(referer).pathname);
  } catch {
    return null;
  }
}

/** Redirect when URL path locale disagrees with cookie or shop referer locale. */
export function redirectLocalePathMismatch(
  req: NextRequest,
): NextResponse | null {
  const preferredLocale = preferredLocaleFromRequest(req);
  if (!preferredLocale) return null;

  const { pathname } = req.nextUrl;

  const productMatch = pathname.match(/^\/(product|produkt)\/([^/?#]+)\/?$/);
  if (productMatch) {
    const [, segment, rawHandle] = productMatch;
    const handle = decodeURIComponent(rawHandle);
    const pathLocale: AppLocale = segment === "produkt" ? "sv" : "en";
    if (pathLocale === preferredLocale) return null;

    const targetSegment: ProductPathSegment =
      preferredLocale === "sv" ? "produkt" : "product";
    const u = req.nextUrl.clone();
    u.pathname = productPagePath(handle, targetSegment);
    return NextResponse.redirect(u, 308);
  }

  if (!isPublicProducerSlugPath(pathname)) return null;

  const producerMatch = pathname.match(
    /^\/(producer|producent)\/([^/?#]+)\/?$/,
  );
  if (producerMatch) {
    const [, segment, rawSlug] = producerMatch;
    const slug = decodeURIComponent(rawSlug);
    const pathLocale: AppLocale = segment === "producent" ? "sv" : "en";
    if (pathLocale === preferredLocale) return null;

    const targetSegment: ProducerPathSegment =
      preferredLocale === "sv" ? "producent" : "producer";
    const u = req.nextUrl.clone();
    u.pathname = producerPagePath(slug, targetSegment);
    return NextResponse.redirect(u, 308);
  }

  return null;
}
