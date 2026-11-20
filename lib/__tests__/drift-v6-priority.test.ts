import { describe, expect, it } from "vitest"
import { buildDriftOverview } from "@/lib/operations/drift/build-overview"
import {
  companySubtitle,
  isBelowRankInObjective,
  isStartedWithoutInitiative,
  isUnprioritized,
  taskMatchesBotFilter,
} from "@/lib/operations/drift/priority-rules"
import { taskOwnerNames } from "@/lib/operations/drift/column-rules"

const NOW = new Date("2026-11-13T14:00:00.000Z")

describe("Drift v6 priority / color rules", () => {
  it("marks missing objective or initiative as Ej prioriterad (yellow)", () => {
    expect(isUnprioritized({ objective_id: null, initiative_id: null })).toBe(
      true,
    )
    expect(
      isUnprioritized({
        objective_id: "obj",
        initiative_id: null,
      }),
    ).toBe(true)
    expect(
      isUnprioritized({
        objective_id: null,
        initiative_id: "init",
      }),
    ).toBe(true)
    expect(
      isUnprioritized({
        objective_id: "obj",
        initiative_id: "init",
      }),
    ).toBe(false)
  })

  it("marks in_progress without initiative as red rule break", () => {
    expect(
      isStartedWithoutInitiative({
        status: "in_progress",
        title: "Perf: återaktivera ISR",
        initiative_id: null,
      }),
    ).toBe(true)
    expect(
      isStartedWithoutInitiative({
        status: "todo",
        title: "Analytics",
        initiative_id: null,
      }),
    ).toBe(false)
    expect(
      isStartedWithoutInitiative({
        status: "in_progress",
        title: "OK",
        initiative_id: "init",
      }),
    ).toBe(false)
    expect(
      isStartedWithoutInitiative({
        status: "in_progress",
        title: "[PAUSAD] Later",
        initiative_id: null,
      }),
    ).toBe(false)
  })

  it("detects Pågår under rang within the same objective", () => {
    const initiativeById = new Map([
      [
        "i1",
        {
          id: "i1",
          objective_id: "o1",
          company: "pact" as const,
          key: "2.1",
          title: "A",
          owner_agent: "Hugo",
          sort_order: 1,
        },
      ],
      [
        "i2",
        {
          id: "i2",
          objective_id: "o1",
          company: "pact" as const,
          key: "2.2",
          title: "B",
          owner_agent: "Margaux",
          sort_order: 2,
        },
      ],
    ])
    const earlierTodo = {
      id: "t1",
      title: "Earlier",
      status: "todo",
      objective_id: "o1",
      initiative_id: "i1",
      sort_order: 1,
    }
    const laterInProgress = {
      id: "t2",
      title: "Later active",
      status: "in_progress",
      objective_id: "o1",
      initiative_id: "i2",
      sort_order: 1,
    }
    expect(
      isBelowRankInObjective({
        task: laterInProgress,
        siblingsInObjective: [earlierTodo, laterInProgress],
        initiativeById,
        now: NOW,
      }),
    ).toBe(true)
    expect(
      isBelowRankInObjective({
        task: {
          ...laterInProgress,
          initiative_id: "i1",
          sort_order: 1,
        },
        siblingsInObjective: [
          { ...earlierTodo, sort_order: 2 },
          { ...laterInProgress, initiative_id: "i1", sort_order: 1 },
        ],
        initiativeById,
        now: NOW,
      }),
    ).toBe(false)
  })

  it("bot filter matches executor or initiative owner", () => {
    const initiativeById = new Map([
      [
        "i1",
        {
          id: "i1",
          objective_id: "o1",
          company: "pact" as const,
          key: "1.1",
          title: "Checkout",
          owner_agent: "Camille",
          sort_order: 1,
        },
      ],
    ])
    const task = {
      id: "t1",
      title: "Work",
      status: "todo",
      owner_agent: "Hugo",
      initiative_id: "i1",
    }
    expect(
      taskMatchesBotFilter(task, "Hugo", initiativeById, taskOwnerNames),
    ).toBe(true)
    expect(
      taskMatchesBotFilter(task, "Camille", initiativeById, taskOwnerNames),
    ).toBe(true)
    expect(
      taskMatchesBotFilter(task, "Saga", initiativeById, taskOwnerNames),
    ).toBe(false)
  })

  it("company subtitle shows owner", () => {
    expect(companySubtitle("pact")).toBe("PACT · ägs av Pierre")
    expect(companySubtitle("dirtywine")).toBe("Dirty Wine · ägs av Léa")
  })
})

describe("buildDriftOverview v6", () => {
  it("separates companies, ranks Pågår, and flags red/yellow", () => {
    const data = buildDriftOverview({
      now: NOW,
      companyFilter: "pact",
      objectives: [
        {
          id: "o1",
          title: "Checkout-konvertering",
          company: "pact",
          sort_order: 1,
          priority: "high",
          short_label: "Checkout",
          owner: "Pierre",
        },
        {
          id: "o5",
          title: "Teknisk hälsa",
          company: "pact",
          sort_order: 5,
          priority: "medium",
          short_label: "Teknik",
          owner: "Pierre",
        },
        {
          id: "odw",
          title: "B2B",
          company: "dirtywine",
          sort_order: 1,
          priority: "high",
          short_label: "B2B",
          owner: "Léa",
        },
      ],
      initiatives: [
        {
          id: "i11",
          objective_id: "o1",
          company: "pact",
          key: "1.1",
          title: "Kunden tar sig genom kassan",
          owner_agent: "Camille",
          sort_order: 1,
        },
      ],
      tasks: [
        {
          id: "t-pagar",
          title: "Testa svenska kassan",
          status: "in_progress",
          owner_agent: "Camille",
          objective_id: "o1",
          initiative_id: "i11",
          sort_order: 1,
          updated_at: "2026-11-12T10:00:00Z",
        },
        {
          id: "t-red",
          title: "Perf: återaktivera ISR",
          status: "in_progress",
          owner_agent: null,
          objective_id: "o5",
          initiative_id: null,
          sort_order: 0,
          updated_at: "2026-11-12T10:00:00Z",
        },
        {
          id: "t-yellow",
          title: "Analytics: koppla in",
          status: "todo",
          owner_agent: "Hugo",
          objective_id: null,
          initiative_id: null,
          updated_at: "2026-11-12T10:00:00Z",
        },
        {
          id: "t-dw",
          title: "Dirty Wine only",
          status: "in_progress",
          owner_agent: "Léa",
          objective_id: "odw",
          initiative_id: null,
          updated_at: "2026-11-12T10:00:00Z",
        },
        {
          id: "t-done",
          title: "Done this week",
          status: "done",
          owner_agent: "Hugo",
          objective_id: "o1",
          initiative_id: "i11",
          completed_at: "2026-11-12T12:00:00Z",
        },
      ],
      agents: [{ name: "Camille" }, { name: "Hugo" }],
      queue: [
        {
          id: "q1",
          agent: "Oscar",
          title: "UPS-kundnummer",
          question: "Behöver nummer",
          status: "väntar",
          company: "pact",
          deadline: "2026-11-12",
          created_at: "2026-11-10T10:00:00Z",
          task_id: "t-pagar",
        },
      ],
    })

    expect(data.companySubtitle).toBe("PACT · ägs av Pierre")
    expect(data.pagarTasks.map((t) => t.id)).toEqual(["t-pagar", "t-red"])
    expect(data.startedWithoutInitiativeCount).toBe(1)
    expect(data.summary.unprioritized).toBe(2)
    expect(data.pagarTasks[0]?.badge).toBe("waiting_for_you")
    expect(data.pagarTasks[1]?.startedWithoutInitiative).toBe(true)
    expect(data.malObjectives).toHaveLength(2)
    expect(data.malObjectives[0]?.doneCount).toBe(1)
    expect(data.malObjectives[0]?.totalCount).toBe(2)
    expect(data.pipelineObjectives[0]?.defaultExpanded).toBe(true)
    expect(data.weekItems[0]?.id).toBe("t-done")
  })

  it("Klart x av y counts tasks and bot filter includes initiative owners", () => {
    const data = buildDriftOverview({
      now: NOW,
      companyFilter: "pact",
      ownerFilter: "Camille",
      objectives: [
        {
          id: "o1",
          title: "Checkout",
          company: "pact",
          sort_order: 1,
          priority: "high",
          short_label: "Checkout",
        },
      ],
      initiatives: [
        {
          id: "i11",
          objective_id: "o1",
          company: "pact",
          key: "1.1",
          title: "Kassan",
          owner_agent: "Camille",
          sort_order: 1,
        },
      ],
      tasks: [
        {
          id: "t1",
          title: "Done",
          status: "done",
          owner_agent: "Hugo",
          objective_id: "o1",
          initiative_id: "i11",
          completed_at: "2026-11-01T12:00:00Z",
        },
        {
          id: "t2",
          title: "Todo by Hugo under Camille initiative",
          status: "todo",
          owner_agent: "Hugo",
          objective_id: "o1",
          initiative_id: "i11",
          updated_at: "2026-11-12T10:00:00Z",
        },
      ],
      agents: [{ name: "Camille" }, { name: "Hugo" }],
      queue: [],
    })

    expect(data.malObjectives[0]?.totalCount).toBe(2)
    expect(data.malObjectives[0]?.doneCount).toBe(1)
    // Filtered view still sees Hugo's task because Camille owns the initiative
    expect(data.malObjectives[0]?.initiatives[0]?.nastaCount).toBe(1)
  })

  it("bot filter hides unrelated initiatives and scopes Klart meters", () => {
    const data = buildDriftOverview({
      now: NOW,
      companyFilter: "pact",
      ownerFilter: "Hugo",
      objectives: [
        {
          id: "o1",
          title: "Checkout",
          company: "pact",
          sort_order: 1,
          priority: "high",
          short_label: "Checkout",
        },
      ],
      initiatives: [
        {
          id: "i11",
          objective_id: "o1",
          company: "pact",
          key: "1.1",
          title: "Kassan",
          owner_agent: "Camille",
          sort_order: 1,
        },
        {
          id: "i12",
          objective_id: "o1",
          company: "pact",
          key: "1.2",
          title: "Sök",
          owner_agent: "Hugo",
          sort_order: 2,
        },
      ],
      tasks: [
        {
          id: "t-camille-only",
          title: "Camille work",
          status: "done",
          owner_agent: "Camille",
          objective_id: "o1",
          initiative_id: "i11",
          completed_at: "2026-11-01T12:00:00Z",
        },
        {
          id: "t-hugo",
          title: "Hugo search",
          status: "todo",
          owner_agent: "Hugo",
          objective_id: "o1",
          initiative_id: "i12",
          updated_at: "2026-11-12T10:00:00Z",
        },
        {
          id: "t-hugo-done",
          title: "Hugo done",
          status: "done",
          owner_agent: "Hugo",
          objective_id: "o1",
          initiative_id: "i12",
          completed_at: "2026-11-12T12:00:00Z",
        },
      ],
      agents: [{ name: "Camille" }, { name: "Hugo" }],
      queue: [],
    })

    const mal = data.malObjectives[0]!
    expect(mal.initiatives.map((i) => i.id)).toEqual(["i12"])
    expect(mal.hiddenInitiativesCount).toBe(1)
    expect(mal.doneCount).toBe(1)
    expect(mal.totalCount).toBe(2)
    expect(data.summary.pagang).toBe(1)
  })

  it("uses Pågår / Nästa / Klart status labels and green dates only for Klart", () => {
    const data = buildDriftOverview({
      now: NOW,
      companyFilter: "pact",
      objectives: [
        {
          id: "o1",
          title: "Checkout",
          company: "pact",
          sort_order: 1,
          priority: "high",
          short_label: "Checkout",
        },
      ],
      initiatives: [
        {
          id: "i11",
          objective_id: "o1",
          company: "pact",
          key: "1.1",
          title: "Kassan",
          owner_agent: "Camille",
          sort_order: 1,
        },
      ],
      tasks: [
        {
          id: "t-todo",
          title: "Analytics: koppla in",
          status: "todo",
          owner_agent: "Hugo",
          objective_id: null,
          initiative_id: null,
          updated_at: "2026-11-12T10:00:00Z",
        },
        {
          id: "t-pagar",
          title: "Active",
          status: "in_progress",
          owner_agent: "Camille",
          objective_id: "o1",
          initiative_id: "i11",
          due_date: "2026-11-20",
          updated_at: "2026-11-12T10:00:00Z",
        },
        {
          id: "t-done",
          title: "Done",
          status: "done",
          owner_agent: "Hugo",
          objective_id: "o1",
          initiative_id: "i11",
          completed_at: "2026-11-12T12:00:00Z",
        },
      ],
      agents: [{ name: "Camille" }, { name: "Hugo" }],
      queue: [],
    })

    expect(data.unprioritizedTasks[0]?.statusLabel).toBe("Nästa")
    expect(data.pipelineUnprioritized.pagang[0]?.id).toBe("t-todo")
    expect(data.pipelineObjectives[0]?.summaryLine).toContain("Nästa")
    const pagarCard = data.pipelineObjectives[0]?.initiatives[0]?.columns.pagar[0]
    const klartCard = data.pipelineObjectives[0]?.initiatives[0]?.columns.klart[0]
    expect(pagarCard?.atIsDone).toBe(false)
    expect(klartCard?.atIsDone).toBe(true)
  })

  it("keeps Dirty Wine week items out of PACT when DW objectives are loaded", () => {
    const data = buildDriftOverview({
      now: NOW,
      companyFilter: "pact",
      objectives: [
        {
          id: "o1",
          title: "Checkout",
          company: "pact",
          sort_order: 1,
          priority: "high",
          short_label: "Checkout",
        },
        {
          id: "odw",
          title: "dirtywine.se",
          company: "dirtywine",
          sort_order: 3,
          priority: "medium",
          short_label: "DW",
        },
      ],
      initiatives: [
        {
          id: "i-dw",
          objective_id: "odw",
          company: "dirtywine",
          key: "3.1",
          title: "Besökaren möter svensk text och rätt pris",
          owner_agent: "Léa",
          sort_order: 1,
        },
      ],
      tasks: [
        {
          id: "t-pact-done",
          title: "PACT done",
          status: "done",
          owner_agent: "Hugo",
          objective_id: "o1",
          initiative_id: null,
          completed_at: "2026-11-12T12:00:00Z",
        },
        {
          id: "t-dw-footer",
          title: "Dirty Wine footer-rad",
          status: "done",
          owner_agent: "Léa",
          objective_id: "odw",
          initiative_id: "i-dw",
          completed_at: "2026-11-11T11:00:00Z",
        },
        {
          id: "t-dw-access",
          title: "Svensk text på /access-request",
          status: "done",
          owner_agent: "Léa",
          objective_id: "odw",
          initiative_id: "i-dw",
          completed_at: "2026-11-13T10:00:00Z",
        },
      ],
      agents: [{ name: "Hugo" }, { name: "Léa" }],
      queue: [],
    })

    expect(data.weekItems.map((w) => w.id)).toEqual(["t-pact-done"])
    expect(data.pagarTasks.map((t) => t.id)).not.toContain("t-dw-footer")
  })

  it("utan poäng list sorts by goal then status", () => {
    const data = buildDriftOverview({
      now: NOW,
      companyFilter: "pact",
      objectives: [
        {
          id: "o1",
          title: "Checkout",
          company: "pact",
          sort_order: 1,
          priority: "high",
          short_label: "Checkout",
        },
        {
          id: "o2",
          title: "Trafik",
          company: "pact",
          sort_order: 2,
          priority: "high",
          short_label: "Trafik",
        },
      ],
      initiatives: [
        {
          id: "i1",
          objective_id: "o1",
          company: "pact",
          key: "1.1",
          title: "Kassan",
          owner_agent: "Hugo",
          sort_order: 1,
        },
        {
          id: "i2",
          objective_id: "o2",
          company: "pact",
          key: "2.1",
          title: "Guider",
          owner_agent: "Camille",
          sort_order: 1,
        },
      ],
      tasks: [
        {
          id: "g2-pagar",
          title: "Trafik pågår saknar p",
          status: "in_progress",
          owner_agent: "Camille",
          objective_id: "o2",
          initiative_id: "i2",
          task_points: null,
          updated_at: "2026-11-12T10:00:00Z",
        },
        {
          id: "g1-klart",
          title: "Checkout klart saknar p",
          status: "done",
          owner_agent: "Hugo",
          objective_id: "o1",
          initiative_id: "i1",
          task_points: null,
          completed_at: "2026-11-12T12:00:00Z",
        },
        {
          id: "g1-pagar",
          title: "Checkout pågår saknar p",
          status: "in_progress",
          owner_agent: "Hugo",
          objective_id: "o1",
          initiative_id: "i1",
          task_points: null,
          updated_at: "2026-11-12T11:00:00Z",
        },
      ],
      agents: [{ name: "Hugo" }, { name: "Camille" }],
      queue: [],
    })

    expect(data.withoutPointsTasks.map((t) => t.id)).toEqual([
      "g1-pagar",
      "g1-klart",
      "g2-pagar",
    ])
  })
})
