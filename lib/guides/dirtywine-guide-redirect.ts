import { PACT_CONFIG } from "@/lib/site-config";

/**
 * Guides are PACT-owned SEO. On dirtywine.se they must not render —
 * redirect to the same path on pactwines.com (301).
 */
export function isGuidePath(pathname: string): boolean {
  return (
    pathname === "/guides" ||
    pathname.startsWith("/guides/") ||
    pathname === "/guider" ||
    pathname.startsWith("/guider/")
  );
}

/** Absolute 301 target for a dirtywine guide request. Preserves query string. */
export function pactGuideRedirectUrl(
  pathname: string,
  search: string = "",
): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const qs = search && search !== "?" ? search : "";
  return `${PACT_CONFIG.baseUrl}${path}${qs}`;
}
