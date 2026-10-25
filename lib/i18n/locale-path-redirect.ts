import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  PRODUCER_PORTAL_SEGMENTS,
  producerPagePath,
} from "@/lib/i18n/localized-routes";

const PUBLIC_PRODUCER_SLUG_RE =
  /^\/(producers|producer|producenter|producent)\/([^/?#]+)\/?$/;

export function isPublicProductPath(pathname: string): boolean {
  return /^\/(product|produkt)\/[^/?#]+\/?$/.test(pathname);
}

/** True for public profile URLs (current + legacy /producer|/producent/:slug). */
export function isPublicProducerSlugPath(pathname: string): boolean {
  const match = pathname.match(PUBLIC_PRODUCER_SLUG_RE);
  if (!match) return false;
  if (match[1] === "producer" && PRODUCER_PORTAL_SEGMENTS.has(match[2])) {
    return false;
  }
  return true;
}

/**
 * Legacy public profiles:
 * - /producer/:slug → /producers/:slug (portal segments excluded)
 * - /producent/:slug → /producenter/:slug
 */
export function redirectLegacyProducerProfilePath(
  req: NextRequest,
): NextResponse | null {
  const { pathname } = req.nextUrl;

  const enMatch = pathname.match(/^\/producer\/([^/?#]+)\/?$/);
  if (enMatch) {
    const slug = decodeURIComponent(enMatch[1]);
    if (PRODUCER_PORTAL_SEGMENTS.has(slug)) return null;
    const u = req.nextUrl.clone();
    u.pathname = producerPagePath(slug, "producers");
    return NextResponse.redirect(u, 308);
  }

  const svMatch = pathname.match(/^\/producent\/([^/?#]+)\/?$/);
  if (svMatch) {
    const slug = decodeURIComponent(svMatch[1]);
    const u = req.nextUrl.clone();
    u.pathname = producerPagePath(slug, "producenter");
    return NextResponse.redirect(u, 308);
  }

  return null;
}
