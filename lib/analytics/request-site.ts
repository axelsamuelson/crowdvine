/**
 * Server-side site derivation from the request Host header.
 * Never trust client-provided site/host for these columns.
 */

export type AnalyticsEventSite = "pact" | "dirtywine" | "other";

/** Strip port / whitespace; lowercase. Empty string if missing. */
export function normalizeRequestHost(
  hostHeader: string | null | undefined,
): string {
  if (!hostHeader) return "";
  const first = hostHeader.split(",")[0]?.trim() ?? "";
  if (!first) return "";
  // Drop port (IPv6 [::1]:port already uncommon behind Vercel Host).
  const withoutPort = first.replace(/:\d+$/, "");
  return withoutPort.toLowerCase();
}

/** Bare hostname without leading www. */
export function bareHostname(host: string): string {
  return host.toLowerCase().replace(/^www\./, "");
}

/**
 * Derive site from Host:
 * - pactwines.com / www.pactwines.com → pact
 * - dirtywine.se / www.dirtywine.se → dirtywine
 * - anything else → other
 */
export function deriveAnalyticsSiteFromHost(
  hostHeader: string | null | undefined,
): { host: string; site: AnalyticsEventSite } {
  const host = normalizeRequestHost(hostHeader);
  const bare = bareHostname(host);
  if (bare === "pactwines.com") return { host, site: "pact" };
  if (bare === "dirtywine.se") return { host, site: "dirtywine" };
  return { host, site: "other" };
}
