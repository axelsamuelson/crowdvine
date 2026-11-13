import { describe, expect, it } from "vitest"
import {
  buildDriftOverview,
  formatQueueDeadlineLabel,
} from "@/lib/operations/drift/build-overview"
import {
  classifyDriftColumn,
  cleanTaskTitle,
  isDoneThisWeek,
  isPausedTitle,
  taskMatchesOwnerFilter,
} from "@/lib/operations/drift/column-rules"
import {
  deriveDriftTaskBadge,
  extractPrUrlFromDescription,
  formatDriftTaskHeadingLine,
  formatProjectTagLabel,
  stripDescriptionForPanel,
} from "@/lib/operations/drift/display-title"
import {
  deriveJobbarPa,
  deriveVantarPa,
} from "@/lib/operations/drift/jobbar-vantar"

/** Friday 13 Nov 2026 mid-afternoon UTC ≈ Stockholm afternoon (ISO week 46). */
const NOW = new Date("2026-11-13T14:00:00.000Z")

describe("classifyDriftColumn / column rules", () => {
  it("puts in_progress in Pågår unless paused", () => {
    expect(
      classifyDriftColumn(
        {
          id: "1",
          title: "Active work",
          status: "in_progress",
          updated_at: "2026-11-12T10:00:00Z",
        },
        NOW,
      ),
    ).toBe("pagar")
  })

  it("puts [PAUSAD] in Backlog even when in_progress", () => {
    expect(isPausedTitle("[PAUSAD] Acceptera DPA")).toBe(true)
    expect(
      classifyDriftColumn(
        {
          id: "2",
          title: "[PAUSAD] Acceptera DPA",
          status: "in_progress",
          updated_at: "2026-11-12T10:00:00Z",
        },
        NOW,
      ),
    ).toBe("backlog")
  })

  it("classifies recent todo as På gång and stale todo as Backlog", () => {
    expect(
      classifyDriftColumn(
        {
          id: "3",
          title: "Recent todo",
          status: "todo",
          updated_at: "2026-11-10T10:00:00Z",
        },
        NOW,
      ),
    ).toBe("pagang")
    expect(
      classifyDriftColumn(
        {
          id: "4",
          title: "Stale todo",
          status: "todo",
          updated_at: "2026-09-01T10:00:00Z",
        },
        NOW,
      ),
    ).toBe("backlog")
    expect(
      classifyDriftColumn(
        {
          id: "5",
          title: "Due soon",
          status: "todo",
          due_date: "2026-11-20",
          updated_at: "2026-09-01T10:00:00Z",
        },
        NOW,
      ),
    ).toBe("pagang")
  })

  it("treats done this ISO week correctly", () => {
    expect(
      isDoneThisWeek(
        {
          id: "6",
          title: "Done",
          status: "done",
          completed_at: "2026-11-12T12:00:00Z",
        },
        NOW,
      ),
    ).toBe(true)
    expect(
      isDoneThisWeek(
        {
          id: "7",
          title: "Older done",
          status: "done",
          completed_at: "2026-11-05T12:00:00Z",
        },
        NOW,
      ),
    ).toBe(false)
  })

  it("matches owner filter including shared ownership", () => {
    const task = {
      id: "8",
      title: "[Margaux/Saga] Shared",
      status: "todo",
      owner_agent: "Margaux/Saga",
    }
    expect(taskMatchesOwnerFilter(task, "Margaux")).toBe(true)
    expect(taskMatchesOwnerFilter(task, "Saga")).toBe(true)
    expect(taskMatchesOwnerFilter(task, "Hugo")).toBe(false)
    expect(cleanTaskTitle("[Margaux] [PAUSAD] Title")).toBe("Title")
  })
})

describe("formatDriftTaskHeadingLine (v4.1 PR · title)", () => {
  it("prefixes PR #n · cleaned title and never uses description as heading", () => {
    const heading = formatDriftTaskHeadingLine(
      {
        title: "Köpvillkor: ersättningsvin inom två arbetsdagar",
        description:
          "källa: PR #233\nhttps://github.com/axelsamuelson/crowdvine/pull/233\nMergad 12 nov. av Juliette",
      },
      "SEED: Juridik och konsumentvillkor",
    )
    expect(heading).toBe(
      "PR #233 · Köpvillkor: ersättningsvin inom två arbetsdagar",
    )
    expect(heading).not.toMatch(/github\.com/i)
    expect(heading).not.toMatch(/Mergad/i)
  })

  it("strips [Namn] and [PAUSAD] prefixes from the title", () => {
    expect(
      formatDriftTaskHeadingLine({
        title: "[Margaux] [PAUSAD] Systembolagsguide omskrivning",
        description:
          "källa: PR #243\nhttps://github.com/axelsamuelson/crowdvine/pull/243\nMergad 13 nov.",
      }),
    ).toBe("PR #243 · Systembolagsguide omskrivning")
  })

  it("falls back to PR #n when cleaned title is empty", () => {
    const heading = formatDriftTaskHeadingLine(
      {
        title: "   ",
        description: "källa: PR #246\nhttps://github.com/example/repo/pull/246",
      },
      "Konvertering (CRO)",
    )
    expect(heading).toBe("PR #246 · Konvertering (CRO)")
  })

  it("falls back to PR #n when title is only bracket prefixes", () => {
    const heading = formatDriftTaskHeadingLine(
      {
        title: "[Hugo] [PAUSAD]",
        description: "källa: PR #250",
      },
      "SEO",
    )
    expect(heading).toBe("PR #250 · SEO")
  })

  it("uses plain cleaned title when there is no PR marker", () => {
    expect(
      formatDriftTaskHeadingLine({
        title: "[Oscar] UPS-direktleverans",
        description: "Ingen markör",
      }),
    ).toBe("UPS-direktleverans")
  })
})

describe("stripDescriptionForPanel / extractPrUrl", () => {
  it("strips marker line and GitHub URL, keeps body", () => {
    const body = stripDescriptionForPanel(
      "källa: PR #246\nhttps://github.com/axelsamuelson/crowdvine/pull/246\nMergad 13 nov 2026 kl. 15:15 svensk tid (Europe/Stockholm).",
    )
    expect(body).toBe(
      "Mergad 13 nov 2026 kl. 15:15 svensk tid (Europe/Stockholm).",
    )
    expect(body).not.toMatch(/källa:/i)
    expect(body).not.toMatch(/github\.com/i)
  })

  it("extracts PR URL from description", () => {
    expect(
      extractPrUrlFromDescription(
        "källa: PR #246\nhttps://github.com/axelsamuelson/crowdvine/pull/246\nMergad.",
      ),
    ).toBe("https://github.com/axelsamuelson/crowdvine/pull/246")
    expect(extractPrUrlFromDescription("källa: PR #1\nIngen länk")).toBeNull()
  })

  it("strips ops_agent_log marker too", () => {
    expect(
      stripDescriptionForPanel(
        "källa: ops_agent_log 11111111-1111-4111-8111-111111111111\nBody text",
      ),
    ).toBe("Body text")
  })
})

describe("deriveDriftTaskBadge", () => {
  it("sets waiting_for_you when queue task_id matches", () => {
    expect(
      deriveDriftTaskBadge({
        status: "in_progress",
        title: "[Oscar] UPS",
        description: "Fråga om kundnummer",
        waitingQueueTaskIds: new Set(["task-ups"]),
        taskId: "task-ups",
      }),
    ).toBe("waiting_for_you")
  })

  it("sets waiting_for_review from PR marker without calling GitHub", () => {
    expect(
      deriveDriftTaskBadge({
        status: "in_progress",
        title: "Review me",
        description: "källa: PR #99\nhttps://github.com/example/repo/pull/99",
        waitingQueueTaskIds: new Set(),
        taskId: "task-pr",
      }),
    ).toBe("waiting_for_review")
  })

  it("prefers waiting_for_you over review when both apply", () => {
    expect(
      deriveDriftTaskBadge({
        status: "in_progress",
        title: "Both",
        description: "källa: PR #1",
        waitingQueueTaskIds: new Set(["t1"]),
        taskId: "t1",
      }),
    ).toBe("waiting_for_you")
  })

  it("ignores prose wait text without queue row or PR marker", () => {
    expect(
      deriveDriftTaskBadge({
        status: "in_progress",
        title: "[Léa] B2B",
        description: "Väntar på godkännande från Axel",
        waitingQueueTaskIds: new Set(["other"]),
        taskId: "lea-task",
      }),
    ).toBeNull()
  })

  it("returns null for paused or non-in_progress", () => {
    expect(
      deriveDriftTaskBadge({
        status: "in_progress",
        title: "[PAUSAD] X",
        description: "källa: PR #1",
        waitingQueueTaskIds: new Set(["t"]),
        taskId: "t",
      }),
    ).toBeNull()
    expect(
      deriveDriftTaskBadge({
        status: "done",
        title: "Done",
        description: "källa: PR #1",
        waitingQueueTaskIds: new Set(),
        taskId: "d",
      }),
    ).toBeNull()
  })
})

describe("formatProjectTagLabel", () => {
  it("drops trailing parenthetical", () => {
    expect(formatProjectTagLabel("Konvertering (CRO)")).toBe("Konvertering")
    expect(formatProjectTagLabel("Logistik och last mile")).toBe(
      "Logistik och last mile",
    )
  })
})

describe("completed_at week counting", () => {
  it("uses completed_at and falls back to updated_at only when null", () => {
    expect(
      isDoneThisWeek(
        {
          id: "a",
          title: "A",
          status: "done",
          completed_at: "2026-11-12T12:00:00Z",
          updated_at: "2026-10-01T12:00:00Z",
        },
        NOW,
      ),
    ).toBe(true)
    expect(
      isDoneThisWeek(
        {
          id: "b",
          title: "B",
          status: "done",
          completed_at: null,
          updated_at: "2026-11-12T12:00:00Z",
        },
        NOW,
      ),
    ).toBe(true)
    expect(
      isDoneThisWeek(
        {
          id: "c",
          title: "C",
          status: "done",
          completed_at: "2026-11-01T12:00:00Z",
          updated_at: "2026-11-13T19:00:56Z",
        },
        NOW,
      ),
    ).toBe(false)
  })
})

describe("deriveJobbarPa / deriveVantarPa (Elsa exception)", () => {
  const emptyProjects = new Map()

  it("Elsa waits on the whole queue and jobbar becomes förmedlar när ingen egen uppgift", () => {
    const queue = [
      {
        id: "q1",
        agent: "Oscar",
        status: "väntar",
        kind: "övrigt",
        deadline: "2026-11-12",
        company: "pact",
      },
      {
        id: "q2",
        agent: "Colette",
        status: "väntar",
        kind: "mejl",
        deadline: "2026-11-19",
        company: "pact",
      },
    ]
    const vantar = deriveVantarPa({
      agentName: "Elsa",
      isElsa: true,
      queue,
      companyFilter: "both",
      projectCompanyById: emptyProjects,
      todayYmd: "2026-11-13",
    })
    expect(vantar.count).toBe(2)
    expect(vantar.label).toMatch(/2 frågor/)
    expect(vantar.overdue).toBe(1)

    const jobbar = deriveJobbarPa({
      agentName: "Elsa",
      tasks: [],
      logs: [],
      waitingCount: vantar.count,
      companyFilter: "both",
      projectCompanyById: emptyProjects,
      taskCompany: () => "pact",
      now: NOW,
    })
    expect(jobbar).toBe("Förmedlar frågor ur kön")
  })

  it("non-Elsa only counts own queue rows; Colette mejl noun", () => {
    const queue = [
      {
        id: "q1",
        agent: "Colette",
        status: "väntar",
        kind: "mejl",
        deadline: "2026-11-19",
        company: "pact",
      },
      {
        id: "q2",
        agent: "Colette",
        status: "väntar",
        kind: "mejl",
        deadline: "2026-11-19",
        company: "pact",
      },
      {
        id: "q3",
        agent: "Oscar",
        status: "väntar",
        kind: "övrigt",
        company: "pact",
      },
    ]
    const colette = deriveVantarPa({
      agentName: "Colette",
      isElsa: false,
      queue,
      companyFilter: "both",
      projectCompanyById: emptyProjects,
      todayYmd: "2026-11-13",
    })
    expect(colette.count).toBe(2)
    expect(colette.label).toBe("2 mejlutkast")
  })
})

describe("buildDriftOverview summary counts", () => {
  it("counts waiting / pågår / på gång / klart this week from fixtures", () => {
    const data = buildDriftOverview({
      now: NOW,
      companyFilter: "both",
      projects: [
        {
          id: "p1",
          name: "Juridik",
          company: "pact",
          status: "active",
          updated_at: "2026-11-13T10:00:00Z",
        },
      ],
      tasks: [
        {
          id: "t-pagar",
          title: "[Juliette] Aktiv",
          status: "in_progress",
          owner_agent: "Juliette",
          project_id: "p1",
          updated_at: "2026-11-13T09:00:00Z",
        },
        {
          id: "t-pagang",
          title: "[Hugo] Snart",
          status: "todo",
          owner_agent: "Hugo",
          project_id: "p1",
          due_date: "2026-11-18",
          updated_at: "2026-11-01T09:00:00Z",
        },
        {
          id: "t-backlog",
          title: "[Hugo] Gammal",
          status: "todo",
          owner_agent: "Hugo",
          project_id: "p1",
          updated_at: "2026-08-01T09:00:00Z",
        },
        {
          id: "t-paused",
          title: "[PAUSAD] Pausad aktiv",
          status: "in_progress",
          owner_agent: "Juliette",
          project_id: "p1",
          updated_at: "2026-11-12T09:00:00Z",
        },
        {
          id: "t-done-week",
          title: "Klart i veckan",
          status: "done",
          owner_agent: "Juliette",
          project_id: "p1",
          completed_at: "2026-11-12T15:00:00Z",
          description: "källa: PR #233\nKöpvillkor uppdaterade",
        },
        {
          id: "t-done-old",
          title: "Klart förra veckan",
          status: "done",
          owner_agent: "Juliette",
          project_id: "p1",
          completed_at: "2026-11-05T15:00:00Z",
        },
      ],
      agents: [
        {
          name: "Elsa",
          agent_id: "elsa",
          company: "both",
          area: "Frågesamlare",
          active: true,
        },
        {
          name: "Juliette",
          agent_id: "juliette",
          company: "both",
          area: "Juridik",
          active: true,
        },
      ],
      logs: [],
      queue: [
        {
          id: "q-overdue",
          agent: "Oscar",
          kind: "övrigt",
          title: "UPS",
          question: "Kundnummer?",
          status: "väntar",
          deadline: "2026-11-12",
          created_at: "2026-11-10T08:00:00Z",
          company: "pact",
        },
        {
          id: "q-ok",
          agent: "Oscar",
          kind: "övrigt",
          title: "Mejl",
          question: "Adresser?",
          status: "väntar",
          deadline: "2026-11-18",
          created_at: "2026-11-11T08:00:00Z",
          company: "pact",
        },
      ],
    })

    expect(data.summary).toEqual({
      waiting: 2,
      waitingOverdue: 1,
      pagar: 1,
      pagang: 1,
      klartWeek: 1,
    })
    expect(data.queue[0]?.id).toBe("q-overdue")
    expect(data.weekItems[0]?.heading).toBe("PR #233 · Klart i veckan")
    expect(data.weekItems[0]?.projectTag).toBe("Juridik")
    expect(data.weekItems[0]?.detail.description).toBe("Köpvillkor uppdaterade")
    expect(data.weekItems[0]?.detail.description).not.toMatch(/källa:/i)
    expect(formatQueueDeadlineLabel("2026-11-12", true)).toMatch(/Förfallen/)

    const elsa = data.bots.find((b) => b.name === "Elsa")
    expect(elsa?.vantarPa).toMatch(/2 frågor/)
    expect(elsa?.jobbarPa).toBe("Förmedlar frågor ur kön")

    const juridik = data.projects.find((p) => p.id === "p1")
    expect(juridik?.counts.pagar).toBe(1)
    expect(juridik?.counts.pagang).toBe(1)
    expect(juridik?.counts.backlog).toBe(2)
    expect(juridik?.counts.klartWeek).toBe(1)
    expect(juridik?.counts.older).toBe(1)

    expect(data.pagarGroups).toHaveLength(1)
    expect(data.pagarGroups[0]?.ownerLabel).toBe("Juliette")
    expect(data.pagarGroups[0]?.tasks[0]?.heading).toBe("Aktiv")
  })

  it("groups Pågår per bot with badges and empty owner last", () => {
    const data = buildDriftOverview({
      now: NOW,
      companyFilter: "both",
      projects: [
        {
          id: "p-log",
          name: "Logistik och last mile",
          company: "pact",
          status: "active",
        },
        {
          id: "p-konv",
          name: "Konvertering (CRO)",
          company: "pact",
          status: "active",
        },
      ],
      tasks: [
        {
          id: "task-ups",
          title: "[Oscar] UPS-direktleverans i drift",
          status: "in_progress",
          owner_agent: "Oscar",
          project_id: "p-log",
          due_date: "2026-11-20",
          updated_at: "2026-11-13T09:00:00Z",
        },
        {
          id: "task-pr-open",
          title: "[Camille] Checkout hotfix review",
          status: "in_progress",
          owner_agent: "Camille",
          project_id: "p-konv",
          description:
            "källa: PR #246\nhttps://github.com/example/repo/pull/246\nÖppen PR",
          updated_at: "2026-11-13T09:00:00Z",
        },
        {
          id: "task-orphan",
          title: "Ingen ägare här",
          status: "in_progress",
          owner_agent: null,
          project_id: "p-konv",
          updated_at: "2026-11-13T09:00:00Z",
        },
        {
          id: "task-done-pr",
          title: "Hotfix mot kontoövertagande i kassan",
          status: "done",
          owner_agent: null,
          project_id: "p-konv",
          completed_at: "2026-11-13T14:15:00Z",
          description:
            "källa: PR #246\nhttps://github.com/example/repo/pull/246\nMergad 13 nov 2026 kl. 15:15 svensk tid (Europe/Stockholm).",
        },
      ],
      agents: [
        { name: "Oscar", agent_id: "oscar", company: "pact", active: true },
        { name: "Camille", agent_id: "camille", company: "pact", active: true },
      ],
      logs: [],
      queue: [
        {
          id: "q-ups",
          agent: "Oscar",
          kind: "övrigt",
          title: "UPS",
          question: "Kundnummer?",
          status: "väntar",
          deadline: "2026-11-18",
          created_at: "2026-11-11T08:00:00Z",
          company: "pact",
          task_id: "task-ups",
        },
      ],
    })

    expect(data.pagarGroups.map((g) => g.ownerLabel)).toEqual([
      "Oscar",
      "Camille",
      "Utan ägare",
    ])
    expect(data.pagarGroups[0]?.hasWaitingForYou).toBe(true)
    expect(data.pagarGroups[0]?.tasks[0]?.badge).toBe("waiting_for_you")
    expect(data.pagarGroups[0]?.tasks[0]?.projectTag).toBe(
      "Logistik och last mile",
    )
    expect(data.pagarGroups[1]?.tasks[0]?.badge).toBe("waiting_for_review")
    expect(data.pagarGroups[2]?.ownerLabel).toBe("Utan ägare")

    const week = data.weekItems.find((w) => w.id === "task-done-pr")
    expect(week?.heading).toBe(
      "PR #246 · Hotfix mot kontoövertagande i kassan",
    )
    expect(week?.detail.owner).toBeNull()
    expect(week?.detail.description).toBe(
      "Mergad 13 nov 2026 kl. 15:15 svensk tid (Europe/Stockholm).",
    )
    expect(week?.detail.prNumber).toBe(246)
    expect(week?.detail.prUrl).toBe(
      "https://github.com/example/repo/pull/246",
    )
    expect(week?.projectTag).toBe("Konvertering")
  })

  it("projectFilter keeps only that project (for ?project= expansion target)", () => {
    const data = buildDriftOverview({
      now: NOW,
      companyFilter: "both",
      projectFilter: "p-konv",
      projects: [
        { id: "p-log", name: "Logistik", company: "pact", status: "active" },
        {
          id: "p-konv",
          name: "Konvertering (CRO)",
          company: "pact",
          status: "active",
        },
      ],
      tasks: [
        {
          id: "t1",
          title: "A",
          status: "todo",
          project_id: "p-log",
          due_date: "2026-11-20",
          updated_at: "2026-11-10T00:00:00Z",
        },
        {
          id: "t2",
          title: "B",
          status: "todo",
          project_id: "p-konv",
          due_date: "2026-11-20",
          updated_at: "2026-11-10T00:00:00Z",
        },
      ],
      agents: [],
      logs: [],
      queue: [],
    })
    expect(data.projects.map((p) => p.id)).toEqual(["p-konv"])
    expect(data.projects[0]?.name).toBe("Konvertering (CRO)")
  })
})
