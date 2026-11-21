/**
 * Analytics V2 landing / page types — Hugo H3 patterns.
 * Mirrors SQL analytics_landing_type() (migrations/297).
 */

export type AnalyticsPageType =
  | "start"
  | "plp"
  | "pdp"
  | "guide"
  | "checkout"
  | "account"
  | "producer"
  | "other";

/** Strip query/hash; keep leading slash. Empty → "/". */
export function normalizeAnalyticsPath(
  path: string | null | undefined,
): string {
  if (path == null || !String(path).trim()) return "/";
  const raw = String(path).trim();
  let pathname = raw;
  if (/^https?:\/\//i.test(raw)) {
    try {
      pathname = new URL(raw).pathname || "/";
    } catch {
      pathname = raw.split("?")[0]?.split("#")[0] || "/";
    }
  } else {
    pathname = raw.split("?")[0]?.split("#")[0] || "/";
  }
  if (!pathname.startsWith("/")) pathname = `/${pathname}`;
  return pathname;
}

/**
 * Classify a path (or full URL) into an Analytics V2 page type.
 * Order matches SQL: start → pdp → plp → guide → checkout → account → producer → other.
 */
export function classifyPath(path: string | null | undefined): AnalyticsPageType {
  const p = normalizeAnalyticsPath(path);

  if (/^\/$/.test(p) || /^\/en$/.test(p) || /^\/en\/$/.test(p)) return "start";

  if (
    /^\/(produkt|product)\/[^/]+/.test(p) ||
    /^\/b\/[^/]+\/product\//.test(p)
  ) {
    return "pdp";
  }

  if (
    /^\/(vin|wine)(\/group\/[^/]+)?\/?$/.test(p) ||
    /^\/(vin|wine)\/[^/]+\/?$/.test(p)
  ) {
    return "plp";
  }

  if (/^\/(guider|guides)(\/|$)/.test(p)) return "guide";

  if (/^\/checkout/.test(p)) return "checkout";

  if (
    /^\/(profile|log-in|signup|invite-signup|code-signup|access-request|onboarding)(\/|$)/.test(
      p,
    )
  ) {
    return "account";
  }

  if (/^\/(producenter|producers)(\/|$)/.test(p)) return "producer";

  return "other";
}
