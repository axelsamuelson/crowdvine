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

/** Redirect when URL path locale disagrees with the user's pact_locale cookie. */
export function redirectLocalePathMismatch(
  req: NextRequest,
): NextResponse | null {
  const cookieLocale = parseLocaleCookie(req.cookies.get(LOCALE_COOKIE)?.value);
  if (!cookieLocale) return null;

  const { pathname } = req.nextUrl;

  const productMatch = pathname.match(/^\/(product|produkt)\/([^/?#]+)\/?$/);
  if (productMatch) {
    const [, segment, rawHandle] = productMatch;
    const handle = decodeURIComponent(rawHandle);
    const pathLocale: AppLocale = segment === "produkt" ? "sv" : "en";
    if (pathLocale === cookieLocale) return null;

    const targetSegment: ProductPathSegment =
      cookieLocale === "sv" ? "produkt" : "product";
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
    if (pathLocale === cookieLocale) return null;

    const targetSegment: ProducerPathSegment =
      cookieLocale === "sv" ? "producent" : "producer";
    const u = req.nextUrl.clone();
    u.pathname = producerPagePath(slug, targetSegment);
    return NextResponse.redirect(u, 308);
  }

  return null;
}
