import { describe, expect, it } from "vitest"
import { FOCUS_EFFECT_TREND_MIN_SAMPLE } from "@/lib/operations/drift/focus-constants"
import {
  aggregateCheckoutCompletion,
  aggregateCheckoutForPeriod,
  aggregatePlpPdpForPeriod,
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

  it("sampleSize + currentLabel use selected period, not last trend week alone", () => {
    const events: FocusEffectEvent[] = []
    // Week 45: 2 starts (small)
    for (const id of ["s45a", "s45b"]) {
      events.push({
        session_id: id,
        event_type: "checkout_started",
        created_at: "2026-11-05T12:00:00.000Z",
      })
    }
    // Week 46: 120 starts / 34 completed (large, selected period)
    for (let i = 0; i < 120; i++) {
      events.push({
        session_id: `w46-${i}`,
        event_type: "checkout_started",
        created_at: "2026-11-10T12:00:00.000Z",
      })
    }
    for (let i = 0; i < 34; i++) {
      events.push({
        session_id: `w46-${i}`,
        event_type: "reservation_completed",
        created_at: "2026-11-11T12:00:00.000Z",
      })
    }
    // Empty "current" week bound after W46 — must not steal currentLabel
    const W47: FocusEffectWeekBound = {
      startYmd: "2026-11-16",
      endYmd: "2026-11-22",
      isFuture: false,
    }
    const forWeek46 = aggregateCheckoutCompletion(events, [W45, W46, W47], {
      period: { startYmd: W46.startYmd, endYmd: W46.endYmd },
    })
    expect(forWeek46.sampleSize).toBe(120)
    expect(forWeek46.sampleSize).toBeGreaterThanOrEqual(
      FOCUS_EFFECT_TREND_MIN_SAMPLE,
    )
    expect(forWeek46.currentLabel).toBe(
      "28 % slutförda · 34 av 120 kassor",
    )
    expect(forWeek46.labels[1]).toBe("28 %")
    expect(forWeek46.secondaryLabels[1]).toBe("34/120")

    const forWeek47 = aggregateCheckoutCompletion(events, [W45, W46, W47], {
      period: { startYmd: W47.startYmd, endYmd: W47.endYmd },
    })
    expect(forWeek47.sampleSize).toBe(0)
    expect(forWeek47.currentLabel).toBe("Inga påbörjade kassor")
  })
})

describe("calendar-month period aggregation (Stockholm)", () => {
  it("sums checkout starts across November days, not only the last ISO week", () => {
    const events: FocusEffectEvent[] = [
      {
        session_id: "nov-early",
        event_type: "checkout_started",
        created_at: "2026-11-05T12:00:00.000Z", // W45
      },
      {
        session_id: "nov-mid-a",
        event_type: "checkout_started",
        created_at: "2026-11-10T12:00:00.000Z", // W46
      },
      {
        session_id: "nov-mid-b",
        event_type: "checkout_started",
        created_at: "2026-11-11T12:00:00.000Z",
      },
      {
        session_id: "nov-mid-a",
        event_type: "reservation_completed",
        created_at: "2026-11-11T14:00:00.000Z",
      },
      // December — outside November
      {
        session_id: "dec",
        event_type: "checkout_started",
        created_at: "2026-12-01T12:00:00.000Z",
      },
    ]
    const november = aggregateCheckoutForPeriod(events, {
      startYmd: "2026-11-01",
      endYmd: "2026-11-30",
    })
    expect(november.started).toBe(3)
    expect(november.completed).toBe(1)
    expect(november.label).toBe("33 % slutförda · 1 av 3 kassor")
    expect(november.sampleSize).toBe(3)

    // Weekly series ending on empty W47 must still expose November period label
    const W47: FocusEffectWeekBound = {
      startYmd: "2026-11-16",
      endYmd: "2026-11-22",
    }
    const series = buildFocusEffectSeriesFromEvents(events, [W45, W46, W47], {
      period: { startYmd: "2026-11-01", endYmd: "2026-11-30" },
    })
    expect(series.checkout_completion_rate.currentLabel).toBe(
      "33 % slutförda · 1 av 3 kassor",
    )
    expect(series.checkout_completion_rate.sampleSize).toBe(3)
    expect(series.checkout_completion_rate.labels[0]).toBe("0 %") // W45: 0/1
    expect(series.checkout_completion_rate.secondaryLabels[0]).toBe("0/1")
    expect(series.checkout_completion_rate.secondaryLabels[1]).toBe("1/2")
  })

  it("PLP period aggregation counts unique sessions in the month", () => {
    const events: FocusEffectEvent[] = [
      {
        session_id: "p1",
        event_type: "product_viewed",
        created_at: "2026-11-05T12:00:00.000Z",
      },
      {
        session_id: "p1",
        event_type: "product_list_viewed",
        created_at: "2026-11-10T12:00:00.000Z",
      },
      {
        session_id: "p2",
        event_type: "collection_viewed",
        created_at: "2026-11-12T12:00:00.000Z",
      },
    ]
    const agg = aggregatePlpPdpForPeriod(events, {
      startYmd: "2026-11-01",
      endYmd: "2026-11-30",
    })
    expect(agg.sessions).toBe(2)
    expect(agg.label).toBe("2 sessioner")
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
