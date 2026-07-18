/** Analytics site derived from page_url — mirrors SQL analytics_site(). */
export type AnalyticsSite = "pact" | "dirtywine";

export type AnalyticsSiteFilter = AnalyticsSite | "all";

export function analyticsSite(pageUrl: string | null | undefined): AnalyticsSite | null {
  if (!pageUrl || !pageUrl.trim()) return null;
  try {
    const host = new URL(pageUrl).hostname.toLowerCase().replace(/^www\./, "");
    if (host === "pactwines.com") return "pact";
    if (host === "dirtywine.se") return "dirtywine";
    return null;
  } catch {
    return null;
  }
}

export function parseSiteParam(
  raw: string | null | undefined,
): AnalyticsSiteFilter {
  if (raw === "pact" || raw === "dirtywine" || raw === "all") return raw;
  return "all";
}

/** Dominant site for a session from its event page_urls. */
export function dominantSessionSite(
  pageUrls: (string | null | undefined)[],
): AnalyticsSite | null {
  const counts = new Map<AnalyticsSite, number>();
  for (const url of pageUrls) {
    const s = analyticsSite(url);
    if (!s) continue;
    counts.set(s, (counts.get(s) || 0) + 1);
  }
  let best: AnalyticsSite | null = null;
  let bestN = 0;
  for (const [s, n] of counts) {
    if (n > bestN || (n === bestN && best && s < best)) {
      best = s;
      bestN = n;
    }
  }
  return best;
}
