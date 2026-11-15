import { describe, expect, it } from "vitest"
import { buildDriftFocus } from "@/lib/operations/drift/build-focus"
import { FOCUS_GOAL_BAR_CLASS } from "@/lib/operations/drift/focus-constants"
import {
  completedAtInPeriod,
  focusKlarSummaryLabel,
  focusKlarSummarySuffix,
  focusMonthPeriod,
  focusTrendEndWeek,
  focusWeekPeriod,
  isFutureFocusWeek,
  lastNIsoWeeks,
  stockholmIsoWeekNumber,
} from "@/lib/operations/drift/focus-period"
import { computeFocusSignal } from "@/lib/operations/drift/focus-signal"
import { stockholmIsoWeekBounds } from "@/lib/operations/drift/stockholm-time"

/** Friday 13 Nov 2026 14:00 UTC ≈ Stockholm afternoon in ISO week 46. */
const WEEK46 = new Date("2026-11-13T14:00:00.000Z")
/** Week 43: Mon 19 – Sun 25 Oct 2026 */
const WEEK43 = new Date("2026-10-22T12:00:00.000Z")

const PACT_OBJECTIVES = [
  {
    id: "o1",
    title: "Checkout-konvertering",
    company: "pact" as const,
    sort_order: 1,
    priority: "urgent" as const,
    short_label: "Checkout",
    target_share: 35,
    target_group: null,
    effect_metric_key: "checkout_completion_rate",
  },
  {
    id: "o2",
    title: "Trafik till PLP/PDP",
    company: "pact" as const,
    sort_order: 2,
    priority: "urgent" as const,
    short_label: "Trafik",
    target_share: 35,
    target_group: null,
    effect_metric_key: "plp_pdp_sessions_weekly",
  },
  {
    id: "o3",
    title: "Leverans och drift",
    company: "pact" as const,
    sort_order: 3,
    priority: "high" as const,
    short_label: "Leverans",
    target_share: 15,
    target_group: null,
  },
  {
    id: "o4",
    title: "Produktdata och sortiment",
    company: "pact" as const,
    sort_order: 4,
    priority: "medium" as const,
    short_label: "Produktdata",
    target_share: 15,
    target_group: "4-6",
  },
  {
    id: "o5",
    title: "Teknisk hälsa",
    company: "pact" as const,
    sort_order: 5,
    priority: "medium" as const,
    short_label: "Teknik",
    target_share: 15,
    target_group: "4-6",
  },
  {
    id: "o6",
    title: "Juridik",
    company: "pact" as const,
    sort_order: 6,
    priority: "medium" as const,
    short_label: "Juridik",
    target_share: 15,
    target_group: "4-6",
  },
]

const INITIATIVES = PACT_OBJECTIVES.map((o, i) => ({
  id: `i${i + 1}`,
  objective_id: o.id,
  company: "pact" as const,
  key: `${o.sort_order}.1`,
  title: `Init ${o.short_label}`,
  owner_agent: "Hugo",
  sort_order: 1,
}))

function doneTask(opts: {
  id: string
  objectiveId: string
  points: 1 | 2 | 4 | 8
  owner: string
  completedAt: string
  initiativeId?: string
}) {
  return {
    id: opts.id,
    title: opts.id,
    status: "done",
    owner_agent: opts.owner,
    objective_id: opts.objectiveId,
    initiative_id: opts.initiativeId ?? `i${opts.objectiveId.slice(1)}`,
    task_points: opts.points,
    points_status: "confirmed" as const,
    completed_at: opts.completedAt,
    updated_at: opts.completedAt,
  }
}

describe("focus period / Stockholm week bounds", () => {
  it("treats week as Monday–Sunday Europe/Stockholm", () => {
    const { weekStart, weekEnd } = stockholmIsoWeekBounds(WEEK46)
    expect(weekStart).toBe("2026-11-09")
    expect(weekEnd).toBe("2026-11-15")
    const { isoWeek } = stockholmIsoWeekNumber(WEEK46)
    expect(isoWeek).toBe(46)
  })

  it("includes completed_at on Sunday evening Stockholm in the week", () => {
    // 2026-11-15 22:30 Stockholm = 21:30 UTC (CET)
    expect(
      completedAtInPeriod(
        "2026-11-15T21:30:00.000Z",
        "2026-11-09",
        "2026-11-15",
      ),
    ).toBe(true)
    // Monday 00:30 Stockholm of next week = out
    expect(
      completedAtInPeriod(
        "2026-11-15T23:30:00.000Z",
        "2026-11-09",
        "2026-11-15",
      ),
    ).toBe(false)
  })

  it("builds last 6 ISO weeks ending at selected week", () => {
    const period = focusWeekPeriod(WEEK46)
    const weeks = lastNIsoWeeks(period, 6)
    expect(weeks.map((w) => w.isoWeek)).toEqual([41, 42, 43, 44, 45, 46])
  })

  it("caps month trend end week at the current week during an open month", () => {
    const november = focusMonthPeriod(WEEK46)
    const end = focusTrendEndWeek(november, WEEK46)
    expect(end.isoWeek).toBe(46)
    const weeks = lastNIsoWeeks(end, 6)
    expect(weeks.map((w) => w.isoWeek)).toEqual([41, 42, 43, 44, 45, 46])
    expect(weeks.every((w) => !isFutureFocusWeek(w, WEEK46))).toBe(true)
  })

  it("uses the last week of a fully past month for the trend", () => {
    const october = focusMonthPeriod(WEEK43)
    // WEEK46 is mid-November → October has ended
    const end = focusTrendEndWeek(october, WEEK46)
    expect(end.isoWeek).toBe(44) // 26 Oct–1 Nov 2026 contains Oct 31
    const weeks = lastNIsoWeeks(end, 6)
    expect(weeks.map((w) => w.isoWeek)).toEqual([39, 40, 41, 42, 43, 44])
  })
})

describe("focus goal bar colors", () => {
  it("uses muted rose for Juridik (goal 6), not saturated fuchsia", () => {
    expect(FOCUS_GOAL_BAR_CLASS[6]).toContain("rose")
    expect(FOCUS_GOAL_BAR_CLASS[6]).not.toContain("fuchsia")
    expect(FOCUS_GOAL_BAR_CLASS[3]).toContain("indigo")
  })

  it("uses slate-400 for Teknik (goal 5) in dark mode, not slate-200", () => {
    expect(FOCUS_GOAL_BAR_CLASS[5]).toContain("slate-400")
    expect(FOCUS_GOAL_BAR_CLASS[5]).not.toContain("slate-200")
  })
})

describe("PACT focus signal", () => {
  it("Omfördela when goals 1–2 under 60%", () => {
    const signal = computeFocusSignal({
      company: "pact",
      totalDonePoints: 40,
      periodShortLabel: "v. 46",
      periodInPhrase: "v. 46",
      goals: [
        { rank: 1, shortLabel: "Checkout", donePoints: 5 },
        { rank: 2, shortLabel: "Trafik", donePoints: 9 },
        { rank: 3, shortLabel: "Leverans", donePoints: 13 },
        { rank: 4, shortLabel: "Produktdata", donePoints: 6 },
        { rank: 5, shortLabel: "Teknik", donePoints: 4 },
        { rank: 6, shortLabel: "Juridik", donePoints: 3 },
      ],
    })
    expect(signal.kind).toBe("omfordela")
    expect(signal.headline).toContain("35 %")
    expect(signal.headline).toContain("mål 60 %")
    expect(signal.reason).toContain("Mål 3 Leverans")
  })

  it("I balans when goals 1–2 ≥ 60% and no lower goal exceeds 1 or 2", () => {
    const signal = computeFocusSignal({
      company: "pact",
      totalDonePoints: 25,
      periodShortLabel: "v. 43",
      periodInPhrase: "v. 43",
      goals: [
        { rank: 1, shortLabel: "Checkout", donePoints: 10 },
        { rank: 2, shortLabel: "Trafik", donePoints: 8 },
        { rank: 3, shortLabel: "Leverans", donePoints: 3 },
        { rank: 4, shortLabel: "Produktdata", donePoints: 2 },
        { rank: 5, shortLabel: "Teknik", donePoints: 1 },
        { rank: 6, shortLabel: "Juridik", donePoints: 1 },
      ],
    })
    expect(signal.kind).toBe("i_balans")
    expect(signal.reason).toBeNull()
    expect(signal.headline).toContain("72 %")
  })

  it("Omfördela when a lower goal exceeds goal 1 or 2 even if top share ≥ 60%", () => {
    const signal = computeFocusSignal({
      company: "pact",
      totalDonePoints: 100,
      periodShortLabel: "v. 40",
      periodInPhrase: "v. 40",
      goals: [
        { rank: 1, shortLabel: "Checkout", donePoints: 30 },
        { rank: 2, shortLabel: "Trafik", donePoints: 30 },
        { rank: 3, shortLabel: "Leverans", donePoints: 35 },
        { rank: 4, shortLabel: "Produktdata", donePoints: 5 },
        { rank: 5, shortLabel: "Teknik", donePoints: 0 },
        { rank: 6, shortLabel: "Juridik", donePoints: 0 },
      ],
    })
    expect(signal.kind).toBe("omfordela")
    expect(signal.reason).toContain("Mål 3")
  })
})

describe("Dirty Wine focus signal", () => {
  it("uses mål 1 fick flest poäng and never target shares", () => {
    const signal = computeFocusSignal({
      company: "dirtywine",
      totalDonePoints: 12,
      periodShortLabel: "v. 46",
      periodInPhrase: "v. 46",
      goals: [
        { rank: 1, shortLabel: "B2B", donePoints: 6 },
        { rank: 2, shortLabel: "Faktura", donePoints: 2 },
        { rank: 3, shortLabel: "Sajt", donePoints: 4 },
      ],
    })
    expect(signal.kind).toBe("i_balans")
    expect(signal.headline).toBe("Mål 1 B2B fick flest poäng v. 46")
    expect(signal.reason).toBeNull()
  })
})

describe("buildDriftFocus aggregation", () => {
  it("aggregates week points, group 4–6, missing points, excludes unprioritized/paused", () => {
    const tasks = [
      doneTask({
        id: "d1",
        objectiveId: "o1",
        points: 4,
        owner: "Hugo",
        completedAt: "2026-11-10T12:00:00.000Z",
        initiativeId: "i1",
      }),
      doneTask({
        id: "d2",
        objectiveId: "o1",
        points: 1,
        owner: "Camille",
        completedAt: "2026-11-11T12:00:00.000Z",
        initiativeId: "i1",
      }),
      doneTask({
        id: "d3",
        objectiveId: "o2",
        points: 8,
        owner: "Margaux",
        completedAt: "2026-11-12T12:00:00.000Z",
        initiativeId: "i2",
      }),
      doneTask({
        id: "d4",
        objectiveId: "o3",
        points: 4,
        owner: "Oscar",
        completedAt: "2026-11-12T15:00:00.000Z",
        initiativeId: "i3",
      }),
      doneTask({
        id: "d5",
        objectiveId: "o4",
        points: 2,
        owner: "Colette",
        completedAt: "2026-11-13T10:00:00.000Z",
        initiativeId: "i4",
      }),
      doneTask({
        id: "d6",
        objectiveId: "o5",
        points: 2,
        owner: "Hugo",
        completedAt: "2026-11-13T11:00:00.000Z",
        initiativeId: "i5",
      }),
      doneTask({
        id: "d7",
        objectiveId: "o6",
        points: 1,
        owner: "Juliette",
        completedAt: "2026-11-14T11:00:00.000Z",
        initiativeId: "i6",
      }),
      // Outside week — ignored for period points
      doneTask({
        id: "old",
        objectiveId: "o1",
        points: 8,
        owner: "Hugo",
        completedAt: "2026-10-01T12:00:00.000Z",
        initiativeId: "i1",
      }),
      // Unprioritized done — excluded
      {
        id: "up",
        title: "Loose",
        status: "done",
        owner_agent: "Hugo",
        objective_id: null,
        initiative_id: null,
        task_points: 4,
        points_status: "confirmed" as const,
        completed_at: "2026-11-12T12:00:00.000Z",
      },
      // Paused — excluded
      {
        id: "paused",
        title: "[PAUSAD] Later",
        status: "todo",
        owner_agent: "Hugo",
        objective_id: "o1",
        initiative_id: "i1",
        task_points: 2,
        points_status: "confirmed" as const,
      },
      // Missing points (open)
      {
        id: "nop",
        title: "No points yet",
        status: "todo",
        owner_agent: "Hugo",
        objective_id: "o1",
        initiative_id: "i1",
        task_points: null,
        points_status: null,
        updated_at: "2026-11-12T12:00:00.000Z",
      },
      // Pågår
      {
        id: "pagar",
        title: "In flight",
        status: "in_progress",
        owner_agent: "Saga",
        objective_id: "o1",
        initiative_id: "i1",
        task_points: 2,
        points_status: "proposed" as const,
      },
    ]

    const data = buildDriftFocus({
      now: WEEK46,
      company: "pact",
      periodKind: "week",
      periodAnchor: WEEK46,
      objectives: PACT_OBJECTIVES,
      initiatives: INITIATIVES,
      tasks,
    })

    expect(data.totalDonePoints).toBe(4 + 1 + 8 + 4 + 2 + 2 + 1)
    expect(data.goals.find((g) => g.rank === 1)?.donePoints).toBe(5)
    expect(data.goals.find((g) => g.rank === 1)?.pagarCount).toBe(1)
    expect(data.withoutPointsCount).toBe(1)
    expect(data.groupSummaries).toHaveLength(1)
    expect(data.groupSummaries[0]!.key).toBe("4-6")
    expect(data.groupSummaries[0]!.donePoints).toBe(5)
    expect(data.groupSummaries[0]!.targetShare).toBe(15)
    expect(data.goals.find((g) => g.rank === 4)?.targetLabel).toBe(
      "i grupp 4-6",
    )
    expect(data.bots[0]!.name).toBe("Margaux") // 8 p
    expect(data.bots.find((b) => b.name === "Hugo")?.totalPoints).toBe(6)
    expect(data.signal.kind).toBe("omfordela")
    expect(data.cumulativeTargetMarkers).toEqual([35, 70, 85])
  })

  it("Dirty Wine shows place labels and no target markers", () => {
    const dwObjectives = [
      {
        id: "dw1",
        title: "B2B-försäljning till krogar",
        company: "dirtywine" as const,
        sort_order: 1,
        priority: "urgent" as const,
        short_label: "B2B",
      },
      {
        id: "dw2",
        title: "Order och faktura",
        company: "dirtywine" as const,
        sort_order: 2,
        priority: "high" as const,
        short_label: "Faktura",
      },
      {
        id: "dw3",
        title: "dirtywine.se",
        company: "dirtywine" as const,
        sort_order: 3,
        priority: "medium" as const,
        short_label: "Sajt",
      },
    ]
    const inits = dwObjectives.map((o, i) => ({
      id: `dwi${i + 1}`,
      objective_id: o.id,
      company: "dirtywine" as const,
      key: `${i + 1}.1`,
      title: "Init",
      owner_agent: "Léa",
      sort_order: 1,
    }))
    const tasks = [
      {
        id: "t1",
        title: "A",
        status: "done",
        owner_agent: "Léa",
        objective_id: "dw1",
        initiative_id: "dwi1",
        task_points: 4 as const,
        points_status: "confirmed" as const,
        completed_at: "2026-11-10T12:00:00.000Z",
      },
      {
        id: "t2",
        title: "B",
        status: "done",
        owner_agent: "Hugo",
        objective_id: "dw2",
        initiative_id: "dwi2",
        task_points: 2 as const,
        points_status: "confirmed" as const,
        completed_at: "2026-11-11T12:00:00.000Z",
      },
      {
        id: "t3",
        title: "C",
        status: "done",
        owner_agent: "Inès",
        objective_id: "dw3",
        initiative_id: "dwi3",
        task_points: 2 as const,
        points_status: "confirmed" as const,
        completed_at: "2026-11-12T12:00:00.000Z",
      },
    ]
    const data = buildDriftFocus({
      now: WEEK46,
      company: "dirtywine",
      periodKind: "week",
      periodAnchor: WEEK46,
      objectives: dwObjectives,
      initiatives: inits,
      tasks,
    })
    expect(data.cumulativeTargetMarkers).toEqual([])
    expect(data.signal.headline).toContain("fick flest poäng")
    expect(data.goals[0]!.targetLabel).toMatch(/plats 1 av 3/)
    expect(data.confirmer).toBe("Léa")
  })

  it("month view sums by calendar date across weeks", () => {
    const tasks = [
      doneTask({
        id: "w45",
        objectiveId: "o1",
        points: 2,
        owner: "Hugo",
        completedAt: "2026-11-05T12:00:00.000Z",
        initiativeId: "i1",
      }),
      doneTask({
        id: "w46",
        objectiveId: "o1",
        points: 4,
        owner: "Hugo",
        completedAt: "2026-11-12T12:00:00.000Z",
        initiativeId: "i1",
      }),
      doneTask({
        id: "oct",
        objectiveId: "o1",
        points: 8,
        owner: "Hugo",
        completedAt: "2026-10-20T12:00:00.000Z",
        initiativeId: "i1",
      }),
    ]
    const data = buildDriftFocus({
      now: WEEK46,
      company: "pact",
      periodKind: "month",
      periodAnchor: WEEK46,
      objectives: PACT_OBJECTIVES,
      initiatives: INITIATIVES,
      tasks,
    })
    expect(data.period.kind).toBe("month")
    expect(data.period.shortLabel).toBe("november")
    expect(data.goals.find((g) => g.rank === 1)?.donePoints).toBe(6)
  })

  it("marks effect metrics exampleData only for fallback series", () => {
    const real = buildDriftFocus({
      now: WEEK46,
      company: "pact",
      periodKind: "week",
      periodAnchor: WEEK46,
      objectives: PACT_OBJECTIVES,
      initiatives: INITIATIVES,
      tasks: [],
      effectSeriesByKey: {
        checkout_completion_rate: {
          values: [null, null, null, null, null, 50],
          labels: [null, null, null, null, null, "1 av 2 startade"],
          currentLabel: "1 av 2 startade",
          exampleData: false,
        },
        plp_pdp_sessions_weekly: {
          values: [1, 2, 3, 4, 5, 6],
          labels: ["1", "2", "3", "4", "5", "6"],
          currentLabel: "6",
          exampleData: false,
        },
      },
    })
    const checkout = real.effectMetrics.find(
      (m) => m.metricKey === "checkout_completion_rate",
    )!
    const plp = real.effectMetrics.find(
      (m) => m.metricKey === "plp_pdp_sessions_weekly",
    )!
    expect(checkout.exampleData).toBe(false)
    expect(checkout.currentLabel).toBe("1 av 2 startade")
    expect(checkout.weekLabels[5]).toBe("1 av 2 startade")
    expect(plp.exampleData).toBe(false)
    expect(plp.currentLabel).toBe("6")

    const example = buildDriftFocus({
      now: WEEK46,
      company: "pact",
      periodKind: "week",
      periodAnchor: WEEK46,
      objectives: PACT_OBJECTIVES,
      initiatives: INITIATIVES,
      tasks: [],
      effectSeriesByKey: {
        checkout_completion_rate: {
          values: [1.8],
          labels: ["1,8 %"],
          currentLabel: "1,8 %",
          exampleData: true,
        },
      },
    })
    expect(
      example.effectMetrics.find((m) => m.metricKey === "checkout_completion_rate")
        ?.exampleData,
    ).toBe(true)
  })

  it("owner filter scopes Fokus points to that executor only", () => {
    const tasks = [
      doneTask({
        id: "hugo-done",
        objectiveId: "o1",
        points: 4,
        owner: "Hugo",
        completedAt: "2026-11-12T12:00:00.000Z",
        initiativeId: "i1",
      }),
      doneTask({
        id: "juliette-under-hugo-init",
        objectiveId: "o1",
        points: 2,
        owner: "Juliette",
        completedAt: "2026-11-12T12:00:00.000Z",
        initiativeId: "i1", // Hugo owns initiative 1.1
      }),
    ]
    const filtered = buildDriftFocus({
      now: WEEK46,
      company: "pact",
      ownerFilter: "Hugo",
      periodKind: "week",
      periodAnchor: WEEK46,
      objectives: PACT_OBJECTIVES,
      initiatives: INITIATIVES,
      tasks,
    })
    expect(filtered.totalDonePoints).toBe(4)
    expect(filtered.bots.map((b) => b.name)).toEqual(["Hugo"])
    expect(filtered.bots.find((b) => b.name === "Juliette")).toBeUndefined()
    expect(filtered.goals.find((g) => g.rank === 1)?.donePoints).toBe(4)
    expect(filtered.goals.find((g) => g.rank === 1)?.focusBlurb).toContain(
      "Prioritet 1 · plats",
    )

    const unfiltered = buildDriftFocus({
      now: WEEK46,
      company: "pact",
      periodKind: "week",
      periodAnchor: WEEK46,
      objectives: PACT_OBJECTIVES,
      initiatives: INITIATIVES,
      tasks,
    })
    expect(unfiltered.totalDonePoints).toBe(6)
    expect(unfiltered.bots.find((b) => b.name === "Juliette")?.totalPoints).toBe(
      2,
    )
  })

  it("month trend shows 6 weeks ending at current week, not future Nov weeks", () => {
    const tasks = [
      doneTask({
        id: "w41",
        objectiveId: "o1",
        points: 2,
        owner: "Hugo",
        completedAt: "2026-10-08T12:00:00.000Z",
        initiativeId: "i1",
      }),
      doneTask({
        id: "w46",
        objectiveId: "o1",
        points: 4,
        owner: "Hugo",
        completedAt: "2026-11-12T12:00:00.000Z",
        initiativeId: "i1",
      }),
    ]
    const data = buildDriftFocus({
      now: WEEK46,
      company: "pact",
      periodKind: "month",
      periodAnchor: WEEK46,
      objectives: PACT_OBJECTIVES,
      initiatives: INITIATIVES,
      tasks,
    })
    expect(data.trendWeeks.map((w) => w.isoWeek)).toEqual([
      41, 42, 43, 44, 45, 46,
    ])
    expect(data.trendWeeks.every((w) => !w.isFuture)).toBe(true)
    const g1 = data.trendByGoal.find((g) => g.rank === 1)!
    expect(g1.pointsPerWeek).toEqual([2, 0, 0, 0, 0, 4])
    expect(g1.deltaVsFirst).toBe(2)
    expect(g1.pointsPerWeek.every((p) => p !== null)).toBe(true)
  })
})

describe("focus klar summary label", () => {
  it("follows week and month period wording from the sketch", () => {
    expect(
      focusKlarSummaryLabel(
        { kind: "week", shortLabel: "v. 46" },
        15,
      ),
    ).toBe("15 klart v. 46")
    expect(
      focusKlarSummarySuffix({ kind: "month", shortLabel: "november" }),
    ).toBe("klart i november")
    expect(
      focusKlarSummaryLabel(
        { kind: "month", shortLabel: "november" },
        40,
      ),
    ).toBe("40 klart i november")
  })
})

describe("completed_at semantics (aggregation contract)", () => {
  it("only counts done tasks with completed_at inside the period", () => {
    const tasks = [
      {
        id: "no-stamp",
        title: "Missing stamp",
        status: "done",
        owner_agent: "Hugo",
        objective_id: "o1",
        initiative_id: "i1",
        task_points: 4 as const,
        points_status: "confirmed" as const,
        completed_at: null,
        updated_at: "2026-11-12T12:00:00.000Z",
      },
      doneTask({
        id: "ok",
        objectiveId: "o1",
        points: 2,
        owner: "Hugo",
        completedAt: "2026-11-12T12:00:00.000Z",
        initiativeId: "i1",
      }),
    ]
    const data = buildDriftFocus({
      now: WEEK46,
      company: "pact",
      periodKind: "week",
      periodAnchor: WEEK46,
      objectives: PACT_OBJECTIVES,
      initiatives: INITIATIVES,
      tasks,
    })
    expect(data.totalDonePoints).toBe(2)
  })
})

// Silence unused WEEK43 if tree-shaken — keep for documentation of green week
void WEEK43
