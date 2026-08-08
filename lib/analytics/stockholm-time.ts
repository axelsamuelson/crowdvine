/**
 * Analytics display + day/week bucketing for Europe/Stockholm.
 * Postgres stores timestamptz in UTC; civil days for the dashboard are Stockholm.
 */
export const ANALYTICS_TIMEZONE = "Europe/Stockholm";

/** YYYY-MM-DD in Europe/Stockholm for an instant. */
export function toStockholmDateKey(input: string | Date | number): string {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  // en-CA → YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ANALYTICS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function stockholmTodayDateKey(): string {
  return toStockholmDateKey(Date.now());
}

/** Monday (ISO week) date key in Stockholm for the instant. */
export function stockholmWeekStartKey(input: string | Date | number): string {
  const key = toStockholmDateKey(input);
  if (!key) return "";
  const [y, m, day] = key.split("-").map(Number);
  // Use UTC noon on the civil date so weekday math is stable across DST.
  const noon = new Date(Date.UTC(y, m - 1, day, 12, 0, 0));
  const weekday = noon.getUTCDay(); // 0 Sun .. 6 Sat
  const diff = (weekday + 6) % 7; // days since Monday
  noon.setUTCDate(noon.getUTCDate() - diff);
  return noon.toISOString().slice(0, 10);
}

/** Next civil date key (YYYY-MM-DD), timezone-agnostic calendar arithmetic. */
export function nextDateKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().slice(0, 10);
}

export function eachDateKeyInclusive(fromKey: string, toKey: string): string[] {
  if (!fromKey || !toKey || fromKey > toKey) return [];
  const out: string[] = [];
  for (let k = fromKey; k <= toKey; k = nextDateKey(k)) {
    out.push(k);
    if (out.length > 800) break;
  }
  return out;
}

const stockholmDateTimeFmt = new Intl.DateTimeFormat("sv-SE", {
  timeZone: ANALYTICS_TIMEZONE,
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const stockholmDateFmt = new Intl.DateTimeFormat("sv-SE", {
  timeZone: ANALYTICS_TIMEZONE,
  year: "numeric",
  month: "short",
  day: "numeric",
});

const stockholmTimeFmt = new Intl.DateTimeFormat("sv-SE", {
  timeZone: ANALYTICS_TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const stockholmCompactFmt = new Intl.DateTimeFormat("sv-SE", {
  timeZone: ANALYTICS_TIMEZONE,
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export function formatStockholmDateTime(input: string | Date | number): string {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  return stockholmDateTimeFmt.format(d);
}

export function formatStockholmDate(input: string | Date | number): string {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  return stockholmDateFmt.format(d);
}

export function formatStockholmTime(input: string | Date | number): string {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  return stockholmTimeFmt.format(d);
}

/** Compact list timestamp: "6 aug. 13:44:19" style via sv-SE. */
export function formatStockholmCompact(input: string | Date | number): string {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  return stockholmCompactFmt.format(d);
}
