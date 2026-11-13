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
import { formatDriftTaskHeadingLine } from "@/lib/operations/drift/display-title"
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

describe("formatDriftTaskHeadingLine (title-only)", () => {
  it("uses cleaned title even when description has URL then Mergad line", () => {
    const heading = formatDriftTaskHeadingLine(
      {
        title: "Köpvillkor: ersättningsvin inom två arbetsdagar",
        description:
          "källa: PR #233\nhttps://github.com/axelsamuelson/crowdvine/pull/233\nMergad 12 nov. av Juliette",
      },
      "SEED: Juridik och konsumentvillkor",
    )
    expect(heading).toBe("Köpvillkor: ersättningsvin inom två arbetsdagar")
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
    ).toBe("Systembolagsguide omskrivning")
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
    expect(data.weekItems[0]?.heading).toBe("Klart i veckan")
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
  })
})
