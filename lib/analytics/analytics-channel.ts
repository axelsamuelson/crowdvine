/**
 * Channel classification — mirrors SQL analytics_channel(referrer, utm_source, utm_medium).
 * Evaluate order: internal → paid → social → organic → ai → referral → direct.
 */

export const ANALYTICS_CHANNELS = [
  "internal",
  "paid",
  "social",
  "organic",
  "ai",
  "referral",
  "direct",
] as const;

export type AnalyticsChannel = (typeof ANALYTICS_CHANNELS)[number];

const PAID_MEDIUMS = new Set([
  "cpc",
  "ppc",
  "paid",
  "paidsocial",
  "display",
]);

const SOCIAL_RE =
  /instagram|facebook|tiktok|linkedin|twitter|x\.com|threads|pinterest|reddit|snapchat/i;

const ORGANIC_HOST_RE =
  /google|bing|duckduckgo|yahoo|ecosia|brave|qwant/i;

const AI_HOST_RE =
  /chatgpt|perplexity|claude|copilot|gemini|openai/i;

function hostnameFromReferrer(referrer: string | null | undefined): string | null {
  if (!referrer || !referrer.trim()) return null;
  try {
    return new URL(referrer).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    // Bare host or partial — strip path-ish noise
    const raw = referrer.trim().toLowerCase().replace(/^www\./, "");
    const host = raw.split("/")[0]?.split("?")[0] ?? "";
    return host || null;
  }
}

function isInternalHost(host: string): boolean {
  return (
    host === "pactwines.com" ||
    host.endsWith(".pactwines.com") ||
    host === "dirtywine.se" ||
    host.endsWith(".dirtywine.se")
  );
}

function normUtm(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const v = raw.trim().toLowerCase();
  return v || null;
}

/**
 * Classify acquisition channel from first-touch / entry-event signals.
 */
export function analyticsChannel(
  referrer: string | null | undefined,
  utmSource: string | null | undefined,
  utmMedium: string | null | undefined,
): AnalyticsChannel {
  const host = hostnameFromReferrer(referrer);
  const source = normUtm(utmSource);
  const medium = normUtm(utmMedium);

  // 1. Internal navigation (must be first)
  if (host && isInternalHost(host)) return "internal";

  // 2. Paid
  if (medium && PAID_MEDIUMS.has(medium)) return "paid";

  // 3. Social (substring on host or utm_source — covers l.instagram.com, m.facebook.com)
  if ((host && SOCIAL_RE.test(host)) || (source && SOCIAL_RE.test(source))) {
    return "social";
  }

  // 4. Organic search
  if ((host && ORGANIC_HOST_RE.test(host)) || medium === "organic") {
    return "organic";
  }

  // 5. AI referrers
  if (host && AI_HOST_RE.test(host)) return "ai";

  // 6. Other external host
  if (host) return "referral";

  // Tagged campaign without matching host/medium above
  if (source || medium) return "referral";

  // 7. Direct (empty referrer, no UTM) — also app in-app browsers that strip referrer
  return "direct";
}

/** Pull utm_* from a page URL query string. */
export function utmFromPageUrl(pageUrl: string | null | undefined): {
  source: string | null;
  medium: string | null;
  campaign: string | null;
} {
  if (!pageUrl || !pageUrl.trim()) {
    return { source: null, medium: null, campaign: null };
  }
  try {
    const u = new URL(pageUrl);
    const pick = (k: string) => {
      const v = u.searchParams.get(k);
      return v && v.trim() ? v.trim() : null;
    };
    return {
      source: pick("utm_source"),
      medium: pick("utm_medium"),
      campaign: pick("utm_campaign"),
    };
  } catch {
    return { source: null, medium: null, campaign: null };
  }
}

export function parseChannelFilter(
  raw: string | null | undefined,
): AnalyticsChannel | null {
  if (!raw || raw === "all") return null;
  const v = raw.trim().toLowerCase();
  return (ANALYTICS_CHANNELS as readonly string[]).includes(v)
    ? (v as AnalyticsChannel)
    : null;
}

export function channelLabel(channel: string): string {
  if (!channel) return channel;
  return channel.charAt(0).toUpperCase() + channel.slice(1);
}
