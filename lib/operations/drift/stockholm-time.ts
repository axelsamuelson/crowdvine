/** Europe/Stockholm date helpers for Drift column rules. */

const TZ = "Europe/Stockholm"

export function stockholmDateParts(
  date: Date = new Date(),
): { y: number; m: number; d: number; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
  const weekdayMap: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  }
  return {
    y: Number(get("year")),
    m: Number(get("month")),
    d: Number(get("day")),
    weekday: weekdayMap[get("weekday")] ?? 1,
  }
}

/** YYYY-MM-DD in Europe/Stockholm. */
export function stockholmYmd(date: Date = new Date()): string {
  const { y, m, d } = stockholmDateParts(date)
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
}

/** Monday–Sunday ISO week containing `date` (Stockholm), as YYYY-MM-DD bounds. */
export function stockholmIsoWeekBounds(date: Date = new Date()): {
  weekStart: string
  weekEnd: string
} {
  const { y, m, d, weekday } = stockholmDateParts(date)
  const noonUtc = Date.UTC(y, m - 1, d, 12, 0, 0)
  const monday = new Date(noonUtc - (weekday - 1) * 86400000)
  const sunday = new Date(noonUtc + (7 - weekday) * 86400000)
  return {
    weekStart: stockholmYmd(monday),
    weekEnd: stockholmYmd(sunday),
  }
}

/** Calendar day N days before Stockholm today (YYYY-MM-DD). */
export function stockholmDaysAgoYmd(days: number, now: Date = new Date()): string {
  const { y, m, d } = stockholmDateParts(now)
  const noonUtc = Date.UTC(y, m - 1, d, 12, 0, 0)
  return stockholmYmd(new Date(noonUtc - days * 86400000))
}

export function formatStockholmDateTime(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(d)
    .replace(",", "")
}

export function formatStockholmDate(ymdOrIso: string | null | undefined): string {
  if (!ymdOrIso) return ""
  const d = /^\d{4}-\d{2}-\d{2}$/.test(ymdOrIso)
    ? new Date(`${ymdOrIso}T12:00:00+01:00`)
    : new Date(ymdOrIso)
  if (Number.isNaN(d.getTime())) return ""
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
  }).format(d)
}

export { TZ as STOCKHOLM_TZ }
