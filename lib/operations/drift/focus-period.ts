import {
  stockholmDateParts,
  stockholmIsoWeekBounds,
  stockholmYmd,
  STOCKHOLM_TZ,
} from "./stockholm-time"

export type FocusPeriodKind = "week" | "month"

export interface FocusPeriodBounds {
  kind: FocusPeriodKind
  /** Inclusive YYYY-MM-DD (Stockholm calendar). */
  startYmd: string
  /** Inclusive YYYY-MM-DD (Stockholm calendar). */
  endYmd: string
  /** ISO week number when kind=week. */
  isoWeek?: number
  isoYear?: number
  /** Calendar month 1–12 when kind=month. */
  month?: number
  year?: number
  /** Short Swedish label e.g. "v. 46" or "november". */
  shortLabel: string
  /** Longer label e.g. "v. 46, 9–15 nov." */
  rangeLabel: string
  /** Subtitle e.g. "mån–sön, svensk tid" */
  rangeHint: string
}

const MONTH_SV = [
  "januari",
  "februari",
  "mars",
  "april",
  "maj",
  "juni",
  "juli",
  "augusti",
  "september",
  "oktober",
  "november",
  "december",
] as const

const MONTH_SHORT_SV = [
  "jan.",
  "feb.",
  "mars",
  "apr.",
  "maj",
  "juni",
  "juli",
  "aug.",
  "sep.",
  "okt.",
  "nov.",
  "dec.",
] as const

/** ISO week number (1–53) for a Stockholm calendar date at noon. */
export function stockholmIsoWeekNumber(date: Date = new Date()): {
  isoYear: number
  isoWeek: number
} {
  const { y, m, d, weekday } = stockholmDateParts(date)
  // Thursday of this week determines ISO year/week
  const noon = Date.UTC(y, m - 1, d, 12, 0, 0)
  const thursday = new Date(noon + (4 - weekday) * 86400000)
  const ty = thursday.getUTCFullYear()
  const jan1 = Date.UTC(ty, 0, 1, 12, 0, 0)
  const jan1Parts = stockholmDateParts(new Date(jan1))
  // Use UTC day-of-year of Thursday
  const dayOfYear =
    Math.floor((thursday.getTime() - Date.UTC(ty, 0, 1, 12, 0, 0)) / 86400000) +
    1
  const isoWeek = Math.floor((dayOfYear - 1) / 7) + 1
  void jan1Parts
  return { isoYear: ty, isoWeek }
}

export function addStockholmDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number)
  const noon = Date.UTC(y!, m! - 1, d!, 12, 0, 0)
  return stockholmYmd(new Date(noon + days * 86400000))
}

export function focusWeekPeriod(date: Date = new Date()): FocusPeriodBounds {
  const { weekStart, weekEnd } = stockholmIsoWeekBounds(date)
  const { isoYear, isoWeek } = stockholmIsoWeekNumber(date)
  const startParts = stockholmDateParts(
    new Date(`${weekStart}T12:00:00+01:00`),
  )
  const endParts = stockholmDateParts(new Date(`${weekEnd}T12:00:00+01:00`))
  const sameMonth = startParts.m === endParts.m
  const rangeLabel = sameMonth
    ? `v. ${isoWeek}, ${startParts.d}–${endParts.d} ${MONTH_SHORT_SV[startParts.m - 1]}`
    : `v. ${isoWeek}, ${startParts.d} ${MONTH_SHORT_SV[startParts.m - 1]}–${endParts.d} ${MONTH_SHORT_SV[endParts.m - 1]}`
  return {
    kind: "week",
    startYmd: weekStart,
    endYmd: weekEnd,
    isoWeek,
    isoYear,
    shortLabel: `v. ${isoWeek}`,
    rangeLabel,
    rangeHint: "mån–sön, svensk tid",
  }
}

export function focusMonthPeriod(date: Date = new Date()): FocusPeriodBounds {
  const { y, m } = stockholmDateParts(date)
  const startYmd = `${y}-${String(m).padStart(2, "0")}-01`
  const lastDay = new Date(Date.UTC(y, m, 0, 12, 0, 0)).getUTCDate()
  const endYmd = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
  return {
    kind: "month",
    startYmd,
    endYmd,
    month: m,
    year: y,
    shortLabel: MONTH_SV[m - 1]!,
    rangeLabel: `${MONTH_SV[m - 1]} ${y}`,
    rangeHint: "kalendermånad, svensk tid",
  }
}

export function shiftFocusPeriod(
  period: FocusPeriodBounds,
  delta: number,
): FocusPeriodBounds {
  if (period.kind === "week") {
    const mid = addStockholmDays(period.startYmd, 3)
    const shifted = addStockholmDays(mid, delta * 7)
    return focusWeekPeriod(new Date(`${shifted}T12:00:00+01:00`))
  }
  const y = period.year!
  const m = period.month!
  const total = y * 12 + (m - 1) + delta
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  const anchor = `${ny}-${String(nm).padStart(2, "0")}-15`
  return focusMonthPeriod(new Date(`${anchor}T12:00:00+01:00`))
}

/** Last N ISO weeks ending at `endWeek` (inclusive), oldest first. */
export function lastNIsoWeeks(
  endWeek: FocusPeriodBounds,
  n: number,
): FocusPeriodBounds[] {
  const base =
    endWeek.kind === "week"
      ? endWeek
      : focusWeekPeriod(new Date(`${endWeek.endYmd}T12:00:00+01:00`))
  const out: FocusPeriodBounds[] = []
  for (let i = n - 1; i >= 0; i--) {
    out.push(shiftFocusPeriod(base, -i))
  }
  return out
}

/** True if completed_at falls on a Stockholm calendar day within [start, end]. */
export function completedAtInPeriod(
  completedAt: string | null | undefined,
  startYmd: string,
  endYmd: string,
): boolean {
  if (!completedAt) return false
  const d = new Date(completedAt)
  if (Number.isNaN(d.getTime())) return false
  const ymd = stockholmYmd(d)
  return ymd >= startYmd && ymd <= endYmd
}

export function formatSharePct(share: number): string {
  const rounded = Math.round(share)
  return `${rounded} %`
}

/**
 * Suffix after the klar count on the Fokus tab header.
 * Full chip: `${count} ${focusKlarSummarySuffix(period)}`
 * → "15 klart v. 46" / "15 klart i november"
 */
export function focusKlarSummarySuffix(
  period: Pick<FocusPeriodBounds, "kind" | "shortLabel">,
): string {
  if (period.kind === "month") return `klart i ${period.shortLabel}`
  return `klart ${period.shortLabel}`
}

export function focusKlarSummaryLabel(
  period: Pick<FocusPeriodBounds, "kind" | "shortLabel">,
  doneTaskCount: number,
): string {
  return `${doneTaskCount} ${focusKlarSummarySuffix(period)}`
}

export { STOCKHOLM_TZ }
