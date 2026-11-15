import { describe, expect, it } from "vitest"
import { FOCUS_EFFECT_TREND_MIN_SAMPLE } from "@/lib/operations/drift/focus-constants"
import {
  aggregateCheckoutCompletion,
  aggregatePlpPdpSessionsWeekly,
  buildFocusEffectSeriesFromEvents,
  EXAMPLE_FOCUS_EFFECT_SERIES,
  focusEffectFetchWindow,
  formatCheckoutStartedLabel,
  formatCheckoutWeekCell,
  formatCheckoutWeekSecondary,
  formatPlpPdpCurrentLabel,
  type FocusEffectEvent,
  type FocusEffectWeekBound,
} from "@/lib/operations/drift/focus-effect-metrics"
import { toStockholmDateKey } from "@/lib/analytics/stockholm-time"

/** Week 46 2026: Mon 9 Nov – Sun 15 Nov (Stockholm). */
const W46: FocusEffectWeekBound = {
  startYmd: "2026-11-09",
  endYmd: "2026-11-15",
}
const W45: FocusEffectWeekBound = {
  startYmd: "2026-11-02",
  endYmd: "2026-11-08",
}

describe("formatCheckoutStartedLabel / week cell", () => {
  it("formats percent + kassor and handles y=0", () => {
    expect(formatCheckoutStartedLabel(0, 2)).toBe(
      "0 % slutförda · 0 av 2 kassor",
    )
    expect(formatCheckoutStartedLabel(1, 2)).toBe(
      "50 % slutförda · 1 av 2 kassor",
    )
    expect(formatCheckoutStartedLabel(0, 0)).toBe("Inga påbörjade kassor")
    expect(formatCheckoutWeekCell(1, 2)).toBe("50 %")
    expect(formatCheckoutWeekSecondary(1, 2)).toBe("1/2")
    expect(formatCheckoutWeekCell(0, 0)).toBeNull()
    expect(formatCheckoutWeekSecondary(0, 0)).toBeNull()
  })

  it("formats PLP current label with unit", () => {
    expect(formatPlpPdpCurrentLabel(8)).toBe("8 sessioner")
  })
})

describe("Stockholm week boundaries for effect events", () => {
  it("keeps Sunday 23:30 Stockholm inside the same ISO week", () => {
    // 2026-11-15 22:30 UTC = 23:30 CET
    const ymd = toStockholmDateKey("2026-11-15T22:30:00.000Z")
    expect(ymd).toBe("2026-11-15")
    expect(ymd >= W46.startYmd && ymd <= W46.endYmd).toBe(true)
  })

  it("puts Monday 00:30 Stockholm in the next week", () => {
    // 2026-11-15 23:30 UTC = 00:30 CET Mon 16 Nov
    const ymd = toStockholmDateKey("2026-11-15T23:30:00.000Z")
    expect(ymd).toBe("2026-11-16")
    expect(ymd >= W46.startYmd && ymd <= W46.endYmd).toBe(false)
  })
})

describe("aggregatePlpPdpSessionsWeekly", () => {
  it("counts unique sessions with PLP/PDP events per week", () => {
    const events: FocusEffectEvent[] = [
      {
        session_id: "s1",
        event_type: "product_list_viewed",
        created_at: "2026-11-10T12:00:00.000Z",
      },
      {
        session_id: "s1",
        event_type: "product_viewed",
        created_at: "2026-11-10T13:00:00.000Z",
      },
      {
        session_id: "s2",
        event_type: "collection_viewed",
        created_at: "2026-11-14T12:00:00.000Z",
      },
      {
        session_id: "s3",
        event_type: "product_viewed",
        created_at: "2026-11-05T12:00:00.000Z",
      },
      {
        session_id: "s-ignore",
        event_type: "page_view",
        created_at: "2026-11-10T12:00:00.000Z",
      },
    ]
    const series = aggregatePlpPdpSessionsWeekly(events, [W45, W46])
    expect(series.exampleData).toBe(false)
    expect(series.values).toEqual([1, 2])
    expect(series.labels).toEqual(["1", "2"])
    expect(series.currentLabel).toBe("2 sessioner")
    expect(series.sampleSize).toBe(3)
  })

  it("renders future weeks as null (grey – in UI)", () => {
    const series = aggregatePlpPdpSessionsWeekly(
      [
        {
          session_id: "s1",
          event_type: "product_viewed",
          created_at: "2026-11-10T12:00:00.000Z",
        },
      ],
      [
        W46,
        {
          ...W46,
          startYmd: "2026-11-16",
          endYmd: "2026-11-22",
          isFuture: true,
        },
      ],
    )
    expect(series.values).toEqual([1, null])
    expect(series.labels).toEqual(["1", null])
  })
})

describe("aggregateCheckoutCompletion", () => {
  it("builds rate sparkline and percent / fraction labels", () => {
    const events: FocusEffectEvent[] = [
      {
        session_id: "a",
        event_type: "checkout_started",
        created_at: "2026-11-10T12:00:00.000Z",
      },
      {
        session_id: "b",
        event_type: "checkout_started",
        created_at: "2026-11-11T12:00:00.000Z",
      },
      {
        session_id: "a",
        event_type: "reservation_completed",
        created_at: "2026-11-11T14:00:00.000Z",
      },
      {
        session_id: "z",
        event_type: "reservation_completed",
        created_at: "2026-11-05T12:00:00.000Z",
      },
    ]
    const series = aggregateCheckoutCompletion(events, [W45, W46])
    expect(series.exampleData).toBe(false)
    expect(series.values[0]).toBeNull()
    expect(series.labels[0]).toBeNull()
    expect(series.secondaryLabels[0]).toBeNull()
    expect(series.values[1]).toBe(50)
    expect(series.labels[1]).toBe("50 %")
    expect(series.secondaryLabels[1]).toBe("1/2")
    expect(series.currentLabel).toBe("50 % slutförda · 1 av 2 kassor")
    expect(series.sampleSize).toBe(2)
    expect(series.sampleSize).toBeLessThan(FOCUS_EFFECT_TREND_MIN_SAMPLE)
  })

  it("currentLabel is Inga påbörjade kassor when last week has y=0", () => {
    const series = aggregateCheckoutCompletion([], [W45, W46])
    expect(series.currentLabel).toBe("Inga påbörjade kassor")
    expect(series.values).toEqual([null, null])
    expect(series.sampleSize).toBe(0)
  })

  it("sampleSize counts started checkouts across weeks (≥30 large sample)", () => {
    const events: FocusEffectEvent[] = []
    for (let i = 0; i < 35; i++) {
      events.push({
        session_id: `big-${i}`,
        event_type: "checkout_started",
        created_at: "2026-11-10T12:00:00.000Z",
      })
    }
    for (let i = 0; i < 10; i++) {
      events.push({
        session_id: `big-${i}`,
        event_type: "reservation_completed",
        created_at: "2026-11-11T12:00:00.000Z",
      })
    }
    const series = aggregateCheckoutCompletion(events, [W45, W46])
    expect(series.sampleSize).toBe(35)
    expect(series.sampleSize).toBeGreaterThanOrEqual(
      FOCUS_EFFECT_TREND_MIN_SAMPLE,
    )
    expect(series.currentLabel).toBe("29 % slutförda · 10 av 35 kassor")
  })
})

describe("buildFocusEffectSeriesFromEvents + example flag", () => {
  it("marks real series exampleData=false and fallback exampleData=true", () => {
    const weeks = [W45, W46]
    const real = buildFocusEffectSeriesFromEvents(
      [
        {
          session_id: "s1",
          event_type: "product_viewed",
          created_at: "2026-11-10T12:00:00.000Z",
        },
        {
          session_id: "c1",
          event_type: "checkout_started",
          created_at: "2026-11-10T12:00:00.000Z",
        },
      ],
      weeks,
      { exampleData: false },
    )
    expect(real.plp_pdp_sessions_weekly.exampleData).toBe(false)
    expect(real.checkout_completion_rate.exampleData).toBe(false)
    expect(
      EXAMPLE_FOCUS_EFFECT_SERIES.checkout_completion_rate.exampleData,
    ).toBe(true)
    expect(EXAMPLE_FOCUS_EFFECT_SERIES.plp_pdp_sessions_weekly.exampleData).toBe(
      true,
    )
  })

  it("focusEffectFetchWindow spans first Monday through day after last Sunday", () => {
    const win = focusEffectFetchWindow([W45, W46])
    expect(win?.sinceIso).toBe("2026-11-02T00:00:00+01:00")
    expect(win?.untilIso).toBe("2026-11-16T00:00:00+01:00")
  })
})
