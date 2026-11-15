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

/** Inclusive Stockholm civil date range for the selected Fokus period. */
export type FocusEffectPeriodBound = {
  startYmd: string
  endYmd: string
}

/** One metric series aligned to Fokus trend weeks (oldest → newest). */
export type FocusEffectSeries = {
  /** Numeric sparkline values; null when unavailable / future / y=0 rate. */
  values: Array<number | null>
  /** Per-week primary cell (e.g. "50 %", "8"); null → grey "–". */
  labels: Array<string | null>
  /** Per-week secondary (e.g. "1/2"); month grid under percent. */
  secondaryLabels: Array<string | null>
  /** Label for the selected Fokus period (week or calendar month). */
  currentLabel: string | null
  /**
   * Sample size for the selected period (started checkouts or sessions).
   * Trend claims require this ≥ FOCUS_EFFECT_TREND_MIN_SAMPLE.
   */
  sampleSize: number
  exampleData: boolean
}

export type FocusEffectSeriesByKey = Record<string, FocusEffectSeries>

function formatPercentSv(pct: number): string {
  const rounded = Math.round(pct)
  return `${rounded} %`
}

/** Expanded / list current label for checkout completion. */
export function formatCheckoutStartedLabel(
  completed: number,
  started: number,
): string {
  if (started <= 0) return "Inga påbörjade kassor"
  const pct = (completed / started) * 100
  return `${formatPercentSv(pct)} slutförda · ${completed} av ${started} kassor`
}

/** Month-grid primary: "50 %"; null when no checkouts. */
export function formatCheckoutWeekCell(
  completed: number,
  started: number,
): string | null {
  if (started <= 0) return null
  return formatPercentSv((completed / started) * 100)
}

/** Month-grid secondary under percent: "1/2". */
export function formatCheckoutWeekSecondary(
  completed: number,
  started: number,
): string | null {
  if (started <= 0) return null
  return `${completed}/${started}`
}

export function formatPlpPdpCurrentLabel(sessions: number): string {
  return `${sessions} sessioner`
}

function weekIndexForYmd(
  ymd: string,
  weeks: FocusEffectWeekBound[],
): number {
  return weeks.findIndex((w) => ymd >= w.startYmd && ymd <= w.endYmd)
}

function ymdInPeriod(
  ymd: string,
  period: FocusEffectPeriodBound,
): boolean {
  return ymd >= period.startYmd && ymd <= period.endYmd
}

/** Checkout totals for an inclusive Stockholm YMD range (selected period). */
export function aggregateCheckoutForPeriod(
  events: FocusEffectEvent[],
  period: FocusEffectPeriodBound,
): { completed: number; started: number; label: string; sampleSize: number } {
  const started = new Set<string>()
  const completed = new Set<string>()
  for (const e of events) {
    if (!e.session_id) continue
    const ymd = toStockholmDateKey(e.created_at)
    if (!ymd || !ymdInPeriod(ymd, period)) continue
    if (e.event_type === "checkout_started") started.add(e.session_id)
    if (e.event_type === "reservation_completed") completed.add(e.session_id)
  }
  const y = started.size
  const x = completed.size
  return {
    completed: x,
    started: y,
    label: formatCheckoutStartedLabel(x, y),
    sampleSize: y,
  }
}

/** Unique PLP/PDP sessions in an inclusive Stockholm YMD range. */
export function aggregatePlpPdpForPeriod(
  events: FocusEffectEvent[],
  period: FocusEffectPeriodBound,
): { sessions: number; label: string; sampleSize: number } {
  const sessions = new Set<string>()
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
    if (!ymd || !ymdInPeriod(ymd, period)) continue
    sessions.add(e.session_id)
  }
  const n = sessions.size
  return {
    sessions: n,
    label: formatPlpPdpCurrentLabel(n),
    sampleSize: n,
  }
}

function emptySeries(
  weeks: FocusEffectWeekBound[],
  exampleData: boolean,
): FocusEffectSeries {
  return {
    values: weeks.map((w) => (w.isFuture ? null : 0)),
    labels: weeks.map((w) => (w.isFuture ? null : "0")),
    secondaryLabels: weeks.map(() => null),
    currentLabel: weeks.some((w) => !w.isFuture) ? formatPlpPdpCurrentLabel(0) : null,
    sampleSize: 0,
    exampleData,
  }
}

/** Unique sessions per week with any PLP/PDP event. */
export function aggregatePlpPdpSessionsWeekly(
  events: FocusEffectEvent[],
  weeks: FocusEffectWeekBound[],
  opts?: { exampleData?: boolean; period?: FocusEffectPeriodBound },
): FocusEffectSeries {
  const exampleData = opts?.exampleData ?? false
  if (weeks.length === 0) {
    return {
      values: [],
      labels: [],
      secondaryLabels: [],
      currentLabel: null,
      sampleSize: 0,
      exampleData,
    }
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
  const secondaryLabels = weeks.map(() => null)
  const periodAgg = opts?.period
    ? aggregatePlpPdpForPeriod(events, opts.period)
    : null
  const lastDefined = [...values].reverse().find((v) => v != null) ?? null
  return {
    values,
    labels,
    secondaryLabels,
    currentLabel: periodAgg
      ? periodAgg.label
      : lastDefined == null
        ? null
        : formatPlpPdpCurrentLabel(lastDefined),
    sampleSize: periodAgg
      ? periodAgg.sampleSize
      : values.reduce<number>((s, v) => s + (v ?? 0), 0),
    exampleData,
  }
}

/**
 * Checkout completion: reservation_completed sessions / checkout_started
 * sessions per Stockholm week. Sparkline = percent when y>0.
 */
export function aggregateCheckoutCompletion(
  events: FocusEffectEvent[],
  weeks: FocusEffectWeekBound[],
  opts?: { exampleData?: boolean; period?: FocusEffectPeriodBound },
): FocusEffectSeries {
  const exampleData = opts?.exampleData ?? false
  if (weeks.length === 0) {
    return {
      values: [],
      labels: [],
      secondaryLabels: [],
      currentLabel: null,
      sampleSize: 0,
      exampleData,
    }
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
  const secondaryLabels: Array<string | null> = []
  for (let i = 0; i < weeks.length; i++) {
    if (weeks[i]?.isFuture) {
      values.push(null)
      labels.push(null)
      secondaryLabels.push(null)
      continue
    }
    const y = started[i]!.size
    const x = completed[i]!.size
    if (y <= 0) {
      values.push(null)
      labels.push(null)
      secondaryLabels.push(null)
    } else {
      values.push(Math.round((x / y) * 1000) / 10) // one decimal for sparkline
      labels.push(formatCheckoutWeekCell(x, y))
      secondaryLabels.push(formatCheckoutWeekSecondary(x, y))
    }
  }

  const periodAgg = opts?.period
    ? aggregateCheckoutForPeriod(events, opts.period)
    : null

  // Fallback current label from last non-future week (when no period given)
  let fallbackLabel: string | null = null
  let fallbackSample = 0
  for (let i = weeks.length - 1; i >= 0; i--) {
    if (weeks[i]?.isFuture) continue
    const y = started[i]!.size
    const x = completed[i]!.size
    fallbackLabel = formatCheckoutStartedLabel(x, y)
    fallbackSample = y
    break
  }

  return {
    values,
    labels,
    secondaryLabels,
    currentLabel: periodAgg ? periodAgg.label : fallbackLabel,
    sampleSize: periodAgg ? periodAgg.sampleSize : fallbackSample,
    exampleData,
  }
}

export function buildFocusEffectSeriesFromEvents(
  events: FocusEffectEvent[],
  weeks: FocusEffectWeekBound[],
  opts?: { exampleData?: boolean; period?: FocusEffectPeriodBound },
): FocusEffectSeriesByKey {
  const exampleData = opts?.exampleData ?? false
  const period = opts?.period
  return {
    plp_pdp_sessions_weekly: aggregatePlpPdpSessionsWeekly(events, weeks, {
      exampleData,
      period,
    }),
    checkout_completion_rate: aggregateCheckoutCompletion(events, weeks, {
      exampleData,
      period,
    }),
  }
}

/** Hardcoded fallback when analytics_sessions_clean is unavailable. */
export const EXAMPLE_FOCUS_EFFECT_SERIES: FocusEffectSeriesByKey = {
  checkout_completion_rate: {
    values: [2.4, 2.2, 2.3, 1.9, 1.7, 1.8],
    labels: ["2 %", "2 %", "2 %", "2 %", "2 %", "2 %"],
    secondaryLabels: ["24/1000", "22/1000", "23/1000", "19/1000", "17/1000", "18/1000"],
    currentLabel: "2 % slutförda · 18 av 1000 kassor",
    sampleSize: 6000,
    exampleData: true,
  },
  plp_pdp_sessions_weekly: {
    values: [980, 1040, 1120, 1150, 1210, 1240],
    labels: ["980", "1040", "1120", "1150", "1210", "1240"],
    secondaryLabels: [null, null, null, null, null, null],
    currentLabel: formatPlpPdpCurrentLabel(1240),
    sampleSize: 980 + 1040 + 1120 + 1150 + 1210 + 1240,
    exampleData: true,
  },
}

/** Inclusive Stockholm civil range → ISO bounds for PostgREST. */
export function focusEffectFetchWindow(
  weeks: FocusEffectWeekBound[],
  period?: FocusEffectPeriodBound | null,
): {
  sinceIso: string
  untilIso: string
} | null {
  const real = weeks.filter((w) => !w.isFuture)
  let start: string | null = real[0]?.startYmd ?? null
  let end: string | null = real[real.length - 1]?.endYmd ?? null
  if (period) {
    start = start == null || period.startYmd < start ? period.startYmd : start
    end = end == null || period.endYmd > end ? period.endYmd : end
  }
  if (start == null || end == null) return null
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
  period?: FocusEffectPeriodBound | null
  site?: string
}): Promise<FocusEffectEvent[] | null> {
  const window = focusEffectFetchWindow(opts.weeks, opts.period)
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
  /** Selected Fokus period — drives currentLabel + trend sampleSize. */
  period?: FocusEffectPeriodBound | null
  site?: string
}): Promise<FocusEffectSeriesByKey> {
  const events = await fetchFocusEffectEvents(opts)
  if (events == null) return EXAMPLE_FOCUS_EFFECT_SERIES
  return buildFocusEffectSeriesFromEvents(events, opts.weeks, {
    exampleData: false,
    period: opts.period ?? undefined,
  })
}

/** @deprecated empty helper kept for imports that expect a no-op series builder */
export function emptyFocusEffectSeries(
  weeks: FocusEffectWeekBound[],
): FocusEffectSeriesByKey {
  return {
    plp_pdp_sessions_weekly: emptySeries(weeks, false),
    checkout_completion_rate: {
      values: weeks.map(() => null),
      labels: weeks.map(() => null),
      secondaryLabels: weeks.map(() => null),
      currentLabel: "Inga påbörjade kassor",
      sampleSize: 0,
      exampleData: false,
    },
  }
}
