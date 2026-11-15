/**
 * Fokus effect metrics from first-party analytics (analytics_sessions_clean),
 * same clean event stream as admin Trafik — not GA4.
 */
import { fetchEventsInDateChunks } from "@/lib/analytics/fetch-events-window"
import { toStockholmDateKey } from "@/lib/analytics/stockholm-time"
import { addStockholmDays } from "@/lib/operations/drift/focus-period"

export const FOCUS_PLP_PDP_EVENT_TYPES = [
  "product_list_viewed",
  "collection_viewed",
  "product_viewed",
] as const

export const FOCUS_CHECKOUT_EVENT_TYPES = [
  "checkout_started",
  "reservation_completed",
] as const

export const FOCUS_EFFECT_EVENT_TYPES = [
  ...FOCUS_PLP_PDP_EVENT_TYPES,
  ...FOCUS_CHECKOUT_EVENT_TYPES,
] as const

export type FocusEffectEvent = {
  session_id: string
  event_type: string
  created_at: string
}

export type FocusEffectWeekBound = {
  startYmd: string
  endYmd: string
  isFuture?: boolean
}

/** One metric series aligned to Fokus trend weeks (oldest → newest). */
export type FocusEffectSeries = {
  /** Numeric sparkline values; null when unavailable / future / y=0 rate. */
  values: Array<number | null>
  /** Per-week cell label (e.g. "0 av 2 startade"); null → grey "–". */
  labels: Array<string | null>
  currentLabel: string | null
  exampleData: boolean
}

export type FocusEffectSeriesByKey = Record<string, FocusEffectSeries>

export function formatCheckoutStartedLabel(
  completed: number,
  started: number,
): string {
  if (started <= 0) return "inga startade"
  return `${completed} av ${started} startade`
}

export function formatCheckoutWeekCell(
  completed: number,
  started: number,
): string | null {
  if (started <= 0) return null
  return `${completed} av ${started} startade`
}

function weekIndexForYmd(
  ymd: string,
  weeks: FocusEffectWeekBound[],
): number {
  return weeks.findIndex((w) => ymd >= w.startYmd && ymd <= w.endYmd)
}

function emptySeries(
  weeks: FocusEffectWeekBound[],
  exampleData: boolean,
): FocusEffectSeries {
  return {
    values: weeks.map((w) => (w.isFuture ? null : 0)),
    labels: weeks.map((w) => (w.isFuture ? null : "0")),
    currentLabel: weeks.some((w) => !w.isFuture) ? "0" : null,
    exampleData,
  }
}

/** Unique sessions per week with any PLP/PDP event. */
export function aggregatePlpPdpSessionsWeekly(
  events: FocusEffectEvent[],
  weeks: FocusEffectWeekBound[],
  opts?: { exampleData?: boolean },
): FocusEffectSeries {
  const exampleData = opts?.exampleData ?? false
  if (weeks.length === 0) {
    return { values: [], labels: [], currentLabel: null, exampleData }
  }

  const sets = weeks.map(() => new Set<string>())
  for (const e of events) {
    if (
      !FOCUS_PLP_PDP_EVENT_TYPES.includes(
        e.event_type as (typeof FOCUS_PLP_PDP_EVENT_TYPES)[number],
      )
    ) {
      continue
    }
    if (!e.session_id) continue
    const ymd = toStockholmDateKey(e.created_at)
    if (!ymd) continue
    const idx = weekIndexForYmd(ymd, weeks)
    if (idx < 0) continue
    if (weeks[idx]?.isFuture) continue
    sets[idx]!.add(e.session_id)
  }

  const values = weeks.map((w, i) => (w.isFuture ? null : sets[i]!.size))
  const labels = values.map((v) => (v == null ? null : String(v)))
  const lastDefined = [...values].reverse().find((v) => v != null) ?? null
  return {
    values,
    labels,
    currentLabel: lastDefined == null ? null : String(lastDefined),
    exampleData,
  }
}

/**
 * Checkout completion: reservation_completed sessions / checkout_started
 * sessions per Stockholm week. Sparkline = percent when y>0; label = "x av y".
 */
export function aggregateCheckoutCompletion(
  events: FocusEffectEvent[],
  weeks: FocusEffectWeekBound[],
  opts?: { exampleData?: boolean },
): FocusEffectSeries {
  const exampleData = opts?.exampleData ?? false
  if (weeks.length === 0) {
    return { values: [], labels: [], currentLabel: null, exampleData }
  }

  const started = weeks.map(() => new Set<string>())
  const completed = weeks.map(() => new Set<string>())

  for (const e of events) {
    if (!e.session_id) continue
    const ymd = toStockholmDateKey(e.created_at)
    if (!ymd) continue
    const idx = weekIndexForYmd(ymd, weeks)
    if (idx < 0) continue
    if (weeks[idx]?.isFuture) continue
    if (e.event_type === "checkout_started") started[idx]!.add(e.session_id)
    if (e.event_type === "reservation_completed")
      completed[idx]!.add(e.session_id)
  }

  const values: Array<number | null> = []
  const labels: Array<string | null> = []
  for (let i = 0; i < weeks.length; i++) {
    if (weeks[i]?.isFuture) {
      values.push(null)
      labels.push(null)
      continue
    }
    const y = started[i]!.size
    const x = completed[i]!.size
    if (y <= 0) {
      values.push(null)
      labels.push(null)
    } else {
      values.push(Math.round((x / y) * 1000) / 10) // one decimal %
      labels.push(formatCheckoutWeekCell(x, y))
    }
  }

  // Current label from last non-future week
  let currentLabel: string | null = null
  for (let i = weeks.length - 1; i >= 0; i--) {
    if (weeks[i]?.isFuture) continue
    const y = started[i]!.size
    const x = completed[i]!.size
    currentLabel = formatCheckoutStartedLabel(x, y)
    break
  }

  return { values, labels, currentLabel, exampleData }
}

export function buildFocusEffectSeriesFromEvents(
  events: FocusEffectEvent[],
  weeks: FocusEffectWeekBound[],
  opts?: { exampleData?: boolean },
): FocusEffectSeriesByKey {
  const exampleData = opts?.exampleData ?? false
  return {
    plp_pdp_sessions_weekly: aggregatePlpPdpSessionsWeekly(events, weeks, {
      exampleData,
    }),
    checkout_completion_rate: aggregateCheckoutCompletion(events, weeks, {
      exampleData,
    }),
  }
}

/** Hardcoded fallback when analytics_sessions_clean is unavailable. */
export const EXAMPLE_FOCUS_EFFECT_SERIES: FocusEffectSeriesByKey = {
  checkout_completion_rate: {
    values: [2.4, 2.2, 2.3, 1.9, 1.7, 1.8],
    labels: [
      "2,4 %",
      "2,2 %",
      "2,3 %",
      "1,9 %",
      "1,7 %",
      "1,8 %",
    ],
    currentLabel: "1,8 %",
    exampleData: true,
  },
  plp_pdp_sessions_weekly: {
    values: [980, 1040, 1120, 1150, 1210, 1240],
    labels: ["980", "1040", "1120", "1150", "1210", "1240"],
    currentLabel: "1240",
    exampleData: true,
  },
}

/** Inclusive Stockholm civil range → ISO bounds for PostgREST. */
export function focusEffectFetchWindow(weeks: FocusEffectWeekBound[]): {
  sinceIso: string
  untilIso: string
} | null {
  const real = weeks.filter((w) => !w.isFuture)
  if (real.length === 0) return null
  const start = real[0]!.startYmd
  const end = real[real.length - 1]!.endYmd
  // Exclusive end: day after last Sunday, Stockholm midnight ≈ use noon+1 day then start of day via UTC ISO of next day 00:00+01
  const untilYmd = addStockholmDays(end, 1)
  return {
    sinceIso: `${start}T00:00:00+01:00`,
    untilIso: `${untilYmd}T00:00:00+01:00`,
  }
}

type SbLike = {
  from: (table: string) => any
}

/**
 * Fetch clean first-party events for Fokus effect metrics (site=pact).
 * Returns null when the clean view is missing / query fails (caller falls back).
 */
export async function fetchFocusEffectEvents(opts: {
  sb: SbLike
  weeks: FocusEffectWeekBound[]
  site?: string
}): Promise<FocusEffectEvent[] | null> {
  const window = focusEffectFetchWindow(opts.weeks)
  if (!window) return []

  const site = opts.site ?? "pact"
  const result = await fetchEventsInDateChunks<FocusEffectEvent>({
    sinceIso: window.sinceIso,
    untilIso: window.untilIso,
    pageSize: 1000,
    maxRows: 50_000,
    chunkDays: 7,
    queryPage: async ({ gteIso, ltIso, from, to }) => {
      let q = opts.sb
        .from("analytics_sessions_clean")
        .select("session_id, event_type, created_at")
        .eq("site", site)
        .in("event_type", [...FOCUS_EFFECT_EVENT_TYPES])
        .gte("created_at", gteIso)
        .order("created_at", { ascending: true })
        .range(from, to)
      if (ltIso) q = q.lt("created_at", ltIso)
      return q
    },
  })

  if (result.error) {
    console.warn(
      "[fokus-effect] analytics_sessions_clean unavailable:",
      result.error.message,
    )
    return null
  }

  return result.rows.filter(
    (r) => typeof r.session_id === "string" && r.session_id.length > 0,
  )
}

export async function loadFocusEffectSeries(opts: {
  sb: SbLike
  weeks: FocusEffectWeekBound[]
  site?: string
}): Promise<FocusEffectSeriesByKey> {
  const events = await fetchFocusEffectEvents(opts)
  if (events == null) return EXAMPLE_FOCUS_EFFECT_SERIES
  return buildFocusEffectSeriesFromEvents(events, opts.weeks, {
    exampleData: false,
  })
}

/** @deprecated empty helper kept for imports that expect a no-op series builder */
export function emptyFocusEffectSeries(
  weeks: FocusEffectWeekBound[],
): FocusEffectSeriesByKey {
  return {
    plp_pdp_sessions_weekly: emptySeries(weeks, false),
    checkout_completion_rate: {
      values: weeks.map((w) => (w.isFuture ? null : null)),
      labels: weeks.map(() => null),
      currentLabel: "inga startade",
      exampleData: false,
    },
  }
}
