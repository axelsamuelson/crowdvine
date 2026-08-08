import {
  analyticsChannel,
  type AnalyticsChannel,
} from "@/lib/analytics/analytics-channel";

/** Stable browser visitor id (localStorage). Never rotated. */
export const VISITOR_ID_KEY = "pact_visitor_id";
/** First-touch attribution blob (localStorage). Written once, never overwritten. */
export const FIRST_TOUCH_KEY = "pact_first_touch";
/**
 * ISO 3166-1 alpha-2 country from Vercel geo header (set by middleware).
 * Session-scoped cookie — browser cannot read x-vercel-ip-country directly.
 */
export const GEO_COUNTRY_COOKIE = "pact_geo_country";

export type FirstTouch = {
  first_referrer: string;
  first_landing_page: string;
  first_utm_source: string | null;
  first_utm_medium: string | null;
  first_utm_campaign: string | null;
  /** ISO 3166-1 alpha-2 at first visit; null if geo cookie unavailable. */
  first_country: string | null;
  /** Acquisition channel at first visit (mirrors analytics_channel). */
  first_channel: AnalyticsChannel;
  first_seen_at: string;
};

function safeUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `v_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function writeCookie(name: string, value: string): void {
  if (typeof document === "undefined") return;
  try {
    // 400 days — mirror long-lived localStorage for server-side event inserts
    const maxAge = 60 * 60 * 24 * 400;
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`;
  } catch {
    // ignore
  }
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  try {
    const prefix = `${name}=`;
    const match = document.cookie.split("; ").find((row) => row.startsWith(prefix));
    if (!match) return null;
    return decodeURIComponent(match.slice(prefix.length));
  } catch {
    return null;
  }
}

/** Read middleware-set geo country (ISO 3166-1 alpha-2) or null. */
export function readGeoCountryCode(): string | null {
  const raw = readCookie(GEO_COUNTRY_COOKIE);
  if (!raw) return null;
  const code = raw.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code) || code === "XX") return null;
  return code;
}

function utmFromSearch(search: string): {
  source: string | null;
  medium: string | null;
  campaign: string | null;
} {
  try {
    const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
    const pick = (k: string) => {
      const v = params.get(k);
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

/**
 * UUID in localStorage, created once. Also mirrored to a cookie for server events.
 */
export function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id || !id.trim()) {
      id = safeUuid();
      localStorage.setItem(VISITOR_ID_KEY, id);
    }
    writeCookie(VISITOR_ID_KEY, id);
    return id;
  } catch {
    return readCookie(VISITOR_ID_KEY) || "";
  }
}

function parseFirstTouch(raw: string | null): FirstTouch | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as Partial<FirstTouch>;
    if (
      typeof obj.first_landing_page !== "string" ||
      typeof obj.first_seen_at !== "string"
    ) {
      return null;
    }
    const first_country =
      typeof obj.first_country === "string" &&
      /^[A-Z]{2}$/i.test(obj.first_country.trim())
        ? obj.first_country.trim().toUpperCase()
        : null;
    const first_referrer =
      typeof obj.first_referrer === "string" ? obj.first_referrer : "";
    const first_utm_source =
      typeof obj.first_utm_source === "string" ? obj.first_utm_source : null;
    const first_utm_medium =
      typeof obj.first_utm_medium === "string" ? obj.first_utm_medium : null;
    const first_utm_campaign =
      typeof obj.first_utm_campaign === "string"
        ? obj.first_utm_campaign
        : null;
    const storedChannel =
      typeof obj.first_channel === "string" ? obj.first_channel.trim() : "";
    const first_channel: AnalyticsChannel =
      storedChannel &&
      [
        "internal",
        "paid",
        "social",
        "organic",
        "ai",
        "referral",
        "direct",
      ].includes(storedChannel)
        ? (storedChannel as AnalyticsChannel)
        : analyticsChannel(first_referrer, first_utm_source, first_utm_medium);
    return {
      first_referrer,
      first_landing_page: obj.first_landing_page,
      first_utm_source,
      first_utm_medium,
      first_utm_campaign,
      first_country,
      first_channel,
      first_seen_at: obj.first_seen_at,
    };
  } catch {
    return null;
  }
}

/**
 * Capture first-touch attribution once. Never overwrites an existing value.
 */
export function getOrCreateFirstTouch(): FirstTouch | null {
  if (typeof window === "undefined") return null;
  try {
    const existing = parseFirstTouch(localStorage.getItem(FIRST_TOUCH_KEY));
    if (existing) {
      writeCookie(FIRST_TOUCH_KEY, JSON.stringify(existing));
      return existing;
    }

    const rawReferrer = document.referrer || "";
    const first_referrer = /localhost|127\.0\.0\.1/i.test(rawReferrer)
      ? ""
      : rawReferrer;
    const first_landing_page =
      `${window.location.pathname}${window.location.search}` || "/";
    const utm = utmFromSearch(window.location.search);
    const touch: FirstTouch = {
      first_referrer,
      first_landing_page,
      first_utm_source: utm.source,
      first_utm_medium: utm.medium,
      first_utm_campaign: utm.campaign,
      first_country: readGeoCountryCode(),
      first_channel: analyticsChannel(first_referrer, utm.source, utm.medium),
      first_seen_at: new Date().toISOString(),
    };
    localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(touch));
    writeCookie(FIRST_TOUCH_KEY, JSON.stringify(touch));
    return touch;
  } catch {
    return parseFirstTouch(readCookie(FIRST_TOUCH_KEY));
  }
}

/** Ensure visitor id + first touch exist (call on first page view). */
export function ensureVisitorIdentity(): {
  visitorId: string;
  firstTouch: FirstTouch | null;
} {
  const visitorId = getVisitorId();
  const firstTouch = getOrCreateFirstTouch();
  return { visitorId, firstTouch };
}

export function readFirstTouchForMetadata(): FirstTouch | null {
  if (typeof window === "undefined") return null;
  try {
    return (
      parseFirstTouch(localStorage.getItem(FIRST_TOUCH_KEY)) ||
      parseFirstTouch(readCookie(FIRST_TOUCH_KEY))
    );
  } catch {
    return null;
  }
}

/** Server-side: parse first_touch JSON from cookie/body. */
export function parseFirstTouchPayload(raw: unknown): FirstTouch | null {
  if (raw == null) return null;
  if (typeof raw === "string") return parseFirstTouch(raw);
  if (typeof raw !== "object") return null;
  return parseFirstTouch(JSON.stringify(raw));
}
