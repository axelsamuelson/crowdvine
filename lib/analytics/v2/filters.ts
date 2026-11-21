/**
 * Analytics V2 URL filter state — shared across admin undersidor.
 * Earliest date: 2026-08-07. Default range: last 28 Stockholm days.
 * Site is always pact|dirtywine (never "all").
 */

import {
  eachDateKeyInclusive,
  stockholmTodayDateKey,
  toStockholmDateKey,
} from "@/lib/analytics/stockholm-time";
import { ANALYTICS_CHANNELS } from "@/lib/analytics/analytics-channel";

export const ANALYTICS_V2_EARLIEST = "2026-08-07";

export type AnalyticsV2Site = "pact" | "dirtywine";
export type AnalyticsV2Grain = "day" | "week" | "month";
/** Etapp 1: include | exclude only. "only" (bara vänner) is etapp 2. */
export type AnalyticsV2Invited = "include" | "exclude";
export type AnalyticsV2Compare = "none" | "previous" | "mom";
export type AnalyticsV2Device = "mobile" | "desktop" | "tablet";

export type AnalyticsV2FilterState = {
  site: AnalyticsV2Site;
  from: string; // YYYY-MM-DD Stockholm
  to: string;
  grain: AnalyticsV2Grain;
  /** all | SE | other | unknown | ISO country code */
  market: string;
  invited: AnalyticsV2Invited;
  channel: string | null;
  device: AnalyticsV2Device | null;
  compare: AnalyticsV2Compare;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function clampDateKey(key: string): string {
  if (!DATE_RE.test(key)) return ANALYTICS_V2_EARLIEST;
  if (key < ANALYTICS_V2_EARLIEST) return ANALYTICS_V2_EARLIEST;
  const today = stockholmTodayDateKey();
  if (key > today) return today;
  return key;
}

/** Inclusive day count between two YYYY-MM-DD keys. */
export function inclusiveDayCount(from: string, to: string): number {
  return eachDateKeyInclusive(from, to).length;
}

function defaultGrainForRange(from: string, to: string): AnalyticsV2Grain {
  return inclusiveDayCount(from, to) >= 28 ? "week" : "day";
}

/** Last N Stockholm civil days ending today (inclusive). */
export function defaultDateRange(
  days = 28,
  now: Date | number = Date.now(),
): { from: string; to: string } {
  const to = toStockholmDateKey(now) || stockholmTodayDateKey();
  const [y, m, d] = to.split("-").map(Number);
  const noon = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  noon.setUTCDate(noon.getUTCDate() - (Math.max(1, days) - 1));
  let from = noon.toISOString().slice(0, 10);
  if (from < ANALYTICS_V2_EARLIEST) from = ANALYTICS_V2_EARLIEST;
  return { from: clampDateKey(from), to: clampDateKey(to) };
}

/** Alias used by admin filter bar. */
export const defaultLast28Days = (now?: Date | number) =>
  defaultDateRange(28, now ?? Date.now());

function parseSite(raw: string | null): AnalyticsV2Site {
  if (raw === "dirtywine") return "dirtywine";
  // "all" and anything else → pact (never all)
  return "pact";
}

function parseGrain(
  raw: string | null,
  from: string,
  to: string,
): AnalyticsV2Grain {
  if (raw === "day" || raw === "week" || raw === "month") return raw;
  return defaultGrainForRange(from, to);
}

function parseMarket(raw: string | null): string {
  if (!raw || raw === "all") return "all";
  if (raw === "SE" || raw === "other" || raw === "unknown") return raw;
  // Single country code (e.g. DE, FR)
  if (/^[A-Za-z]{2}$/.test(raw)) return raw.toUpperCase();
  return "all";
}

function parseInvited(raw: string | null): AnalyticsV2Invited {
  // v1.2 etapp 1: only include/exclude. "only" ignored until etapp 2.
  if (raw === "exclude") return "exclude";
  return "include";
}

function parseChannel(raw: string | null): string | null {
  if (!raw || raw === "all") return null;
  const v = raw.trim().toLowerCase();
  return (ANALYTICS_CHANNELS as readonly string[]).includes(v) ? v : null;
}

function parseDevice(raw: string | null): AnalyticsV2Device | null {
  if (!raw || raw === "all") return null;
  if (raw === "mobile" || raw === "desktop" || raw === "tablet") return raw;
  return null;
}

function parseCompare(raw: string | null): AnalyticsV2Compare {
  if (raw === "none" || raw === "mom") return raw;
  if (raw === "previous") return "previous";
  // Spec 5.2: föregående period förvald
  return "previous";
}

export function parseAnalyticsV2Filters(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): AnalyticsV2FilterState {
  const get = (key: string): string | null => {
    if (params instanceof URLSearchParams) {
      return params.get(key);
    }
    const v = params[key];
    if (Array.isArray(v)) return v[0] ?? null;
    return v ?? null;
  };

  const defaults = defaultDateRange(28);
  let from = clampDateKey(get("from") && DATE_RE.test(get("from")!) ? get("from")! : defaults.from);
  let to = clampDateKey(get("to") && DATE_RE.test(get("to")!) ? get("to")! : defaults.to);
  if (from > to) {
    const tmp = from;
    from = to;
    to = tmp;
  }

  return {
    site: parseSite(get("site")),
    from,
    to,
    grain: parseGrain(get("grain"), from, to),
    market: parseMarket(get("market")),
    invited: parseInvited(get("invited")),
    channel: parseChannel(get("channel")),
    device: parseDevice(get("device")),
    compare: parseCompare(get("compare")),
  };
}

/** Serialize filter state to query string (no leading ?). Omits defaults where safe. */
export function toQueryString(state: AnalyticsV2FilterState): string {
  const p = new URLSearchParams();
  p.set("site", state.site);
  p.set("from", state.from);
  p.set("to", state.to);
  p.set("grain", state.grain);
  if (state.market !== "all") p.set("market", state.market);
  if (state.invited !== "include") p.set("invited", state.invited);
  if (state.channel) p.set("channel", state.channel);
  if (state.device) p.set("device", state.device);
  if (state.compare !== "previous") p.set("compare", state.compare);
  return p.toString();
}

/** Alias used by admin V2 UI. */
export const analyticsV2ToQueryString = toQueryString;

/** Same-length window immediately before `from`–`to`. */
export function previousPeriod(
  from: string,
  to: string,
): { from: string; to: string } {
  const days = inclusiveDayCount(from, to);
  if (days <= 0) {
    return { from: clampDateKey(from), to: clampDateKey(to) };
  }
  const [y, m, d] = from.split("-").map(Number);
  const noon = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  noon.setUTCDate(noon.getUTCDate() - 1);
  const prevTo = noon.toISOString().slice(0, 10);
  noon.setUTCDate(noon.getUTCDate() - (days - 1));
  let prevFrom = noon.toISOString().slice(0, 10);
  if (prevFrom < ANALYTICS_V2_EARLIEST) prevFrom = ANALYTICS_V2_EARLIEST;
  return { from: clampDateKey(prevFrom), to: clampDateKey(prevTo) };
}

/**
 * Comparison window for compare=previous (same length immediately before)
 * or compare=mom (same from/to shifted back one calendar month).
 */
export function compareDateRange(
  state: AnalyticsV2FilterState,
): { from: string; to: string } | null {
  if (state.compare === "none") return null;

  if (state.compare === "previous") {
    return previousPeriod(state.from, state.to);
  }

  // mom: shift both ends back one calendar month
  const shiftMonth = (key: string): string => {
    const [y, m, d] = key.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 2, d, 12, 0, 0)); // month-1 then -1
    return dt.toISOString().slice(0, 10);
  };
  let from = shiftMonth(state.from);
  let to = shiftMonth(state.to);
  if (from < ANALYTICS_V2_EARLIEST) from = ANALYTICS_V2_EARLIEST;
  if (to < from) to = from;
  return { from: clampDateKey(from), to: clampDateKey(to) };
}
