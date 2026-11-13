import {
  formatOpsCompanyLabel,
  parseTaskSourceMarker,
  type OpsCompany,
} from "@/lib/operations/ops-agents"
import {
  classifyDriftColumn,
  doneSortKey,
  isDoneOlderWithin30Days,
  isDoneThisWeek,
  isPausedTitle,
  taskMatchesOwnerFilter,
  taskOwnerNames,
  type DriftTaskLike,
} from "./column-rules"
import { formatDriftTaskHeadingLine } from "./display-title"
import {
  deriveJobbarPa,
  deriveVantarPa,
  isSilentBot,
  type DriftAgentLike,
  type DriftLogLike,
  type DriftQueueLike,
} from "./jobbar-vantar"
import {
  formatStockholmDate,
  formatStockholmDateTime,
  stockholmYmd,
} from "./stockholm-time"
import type {
  DriftBotRow,
  DriftCompanyFilter,
  DriftOverviewData,
  DriftPipelineProject,
  DriftPipelineTaskCard,
  DriftQueueItem,
  DriftWeekItem,
} from "./types"

export interface DriftBuildInput {
  now?: Date
  companyFilter: DriftCompanyFilter
  ownerFilter?: string | null
  projectFilter?: string | null
  projects: Array<{
    id: string
    name: string
    company: string | null
    status: string
    deleted_at?: string | null
    updated_at?: string | null
  }>
  tasks: Array<
    DriftTaskLike & {
      project_id?: string | null
      description?: string | null
    }
  >
  agents: DriftAgentLike[]
  logs: DriftLogLike[]
  queue: Array<
    DriftQueueLike & {
      title: string
      question?: string | null
      detail?: string | null
      recommendation?: string | null
    }
  >
}

function taskCompany(
  task: DriftTaskLike & { project_id?: string | null },
  projectCompanyById: Map<string, OpsCompany>,
): OpsCompany {
  if (!task.project_id) return "pact"
  return projectCompanyById.get(task.project_id) ?? "pact"
}

function companyOk(c: OpsCompany, filter: DriftCompanyFilter): boolean {
  return filter === "both" || c === filter
}

function toCard(
  task: DriftTaskLike & { description?: string | null; project_id?: string | null },
  projectName: string | null,
): DriftPipelineTaskCard {
  const marker = parseTaskSourceMarker(task.description)
  const owners = taskOwnerNames(task)
  return {
    id: task.id,
    heading: formatDriftTaskHeadingLine(task, projectName),
    owner: owners[0] ?? null,
    atLabel: task.completed_at
      ? formatStockholmDateTime(task.completed_at)
      : task.updated_at
        ? formatStockholmDateTime(task.updated_at)
        : null,
    source: marker?.kind ?? null,
    paused: isPausedTitle(task.title),
    href: `/admin/operations/tasks/${task.id}`,
  }
}

export function buildDriftOverview(input: DriftBuildInput): DriftOverviewData {
  const now = input.now ?? new Date()
  const today = stockholmYmd(now)
  const projectCompanyById = new Map<string, OpsCompany>()
  for (const p of input.projects) {
    if (p.deleted_at) continue
    projectCompanyById.set(
      p.id,
      p.company === "dirtywine" ? "dirtywine" : "pact",
    )
  }

  const tasksInCompany = input.tasks.filter((t) => {
    if (t.deleted_at) return false
    if (t.parent_task_id) return false
    return companyOk(taskCompany(t, projectCompanyById), input.companyFilter)
  })

  const tasksFiltered = tasksInCompany.filter((t) => {
    if (input.projectFilter && t.project_id !== input.projectFilter) return false
    return taskMatchesOwnerFilter(t, input.ownerFilter)
  })

  const queueInCompany = input.queue.filter((q) => {
    if (q.status !== "väntar") return false
    const c =
      q.company === "pact" || q.company === "dirtywine"
        ? q.company
        : q.project_id
          ? (projectCompanyById.get(q.project_id) ?? "pact")
          : "pact"
    return companyOk(c, input.companyFilter)
  })

  const sortedQueue = [...queueInCompany].sort((a, b) => {
    const aOver = !!(a.deadline && a.deadline < today)
    const bOver = !!(b.deadline && b.deadline < today)
    if (aOver !== bOver) return aOver ? -1 : 1
    if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline)
    if (a.deadline && !b.deadline) return -1
    if (!a.deadline && b.deadline) return 1
    return (a.created_at ?? "").localeCompare(b.created_at ?? "")
  })

  const queueItems: DriftQueueItem[] = sortedQueue.map((q) => ({
    id: q.id,
    title: q.title,
    question: (q.question || q.detail || "").trim(),
    agent: q.agent,
    kind: q.kind ?? null,
    deadline: q.deadline ?? null,
    recommendation: q.recommendation ?? null,
    overdue: !!(q.deadline && q.deadline < today),
    openHref: `/admin/operations?godkannande=${q.id}`,
  }))

  const waitingOverdue = queueItems.filter((q) => q.overdue).length

  let pagar = 0
  let pagang = 0
  let klartWeek = 0
  for (const t of tasksFiltered) {
    const col = classifyDriftColumn(t, now)
    if (col === "pagar") pagar += 1
    else if (col === "pagang") pagang += 1
    else if (col === "klart" && isDoneThisWeek(t, now)) klartWeek += 1
  }

  const weekCandidates = tasksFiltered
    .filter((t) => isDoneThisWeek(t, now))
    .sort((a, b) => doneSortKey(b).localeCompare(doneSortKey(a)))
    .slice(0, 5)

  const weekItems: DriftWeekItem[] = weekCandidates.map((t) => {
    const project = input.projects.find((p) => p.id === t.project_id)
    const marker = parseTaskSourceMarker(t.description)
    const owners = taskOwnerNames(t)
    const at = t.completed_at ?? t.updated_at ?? ""
    return {
      id: t.id,
      heading: formatDriftTaskHeadingLine(t, project?.name ?? null),
      owner: owners[0] ?? null,
      at,
      atLabel: formatStockholmDateTime(at),
      source: marker?.kind ?? null,
      projectName: project?.name ?? null,
    }
  })

  const logsByAgent = new Map<string, DriftLogLike[]>()
  for (const log of input.logs) {
    const key = log.agent.toLowerCase()
    const list = logsByAgent.get(key) ?? []
    list.push(log)
    logsByAgent.set(key, list)
  }

  const bots: DriftBotRow[] = input.agents
    .filter((a) => a.active !== false)
    .filter((a) => {
      if (input.companyFilter === "both") return true
      if (!a.company || a.company === "both") return true
      return a.company === input.companyFilter
    })
    .filter((a) => {
      if (!input.ownerFilter || input.ownerFilter === "__none__") return true
      return a.name.toLowerCase() === input.ownerFilter.toLowerCase()
    })
    .map((a) => {
      const agentLogs = (logsByAgent.get(a.name.toLowerCase()) ?? []).sort(
        (x, y) => y.created_at.localeCompare(x.created_at),
      )
      const latest = agentLogs[0] ?? null
      const isElsa = a.name.toLowerCase() === "elsa"
      const vantar = deriveVantarPa({
        agentName: a.name,
        isElsa,
        queue: queueInCompany,
        companyFilter: input.companyFilter,
        projectCompanyById,
        todayYmd: today,
      })
      const jobbar = deriveJobbarPa({
        agentName: a.name,
        tasks: tasksInCompany,
        logs: agentLogs,
        waitingCount: vantar.count,
        companyFilter: input.companyFilter,
        projectCompanyById,
        taskCompany: (t) => taskCompany(t, projectCompanyById),
        now,
      })
      const silent = isSilentBot({ latestLogAt: latest?.created_at ?? null, now })
      return {
        id: a.agent_id,
        name: a.name,
        agent_id: a.agent_id,
        company: (a.company as DriftBotRow["company"]) ?? null,
        companyLabel: formatOpsCompanyLabel(
          (a.company as "pact" | "dirtywine" | "both" | null) ?? "pact",
        ),
        area: a.area ?? null,
        latestAt: latest?.created_at ?? null,
        latestAtLabel: latest
          ? formatStockholmDateTime(latest.created_at)
          : "Ingen logg",
        latestAction: latest
          ? latest.detail
            ? `${latest.action}${latest.detail ? ` — ${latest.detail}` : ""}`.slice(
                0,
                140,
              )
            : latest.action
          : "Ingen aktivitet loggad",
        jobbarPa: jobbar,
        vantarPa: vantar.label,
        vantarTone: vantar.tone,
        silent,
      }
    })
    .sort((a, b) => {
      if (a.silent !== b.silent) return a.silent ? 1 : -1
      return (b.latestAt ?? "").localeCompare(a.latestAt ?? "")
    })

  const projectIds = new Set(
    input.projects
      .filter((p) => !p.deleted_at)
      .filter((p) =>
        companyOk(
          p.company === "dirtywine" ? "dirtywine" : "pact",
          input.companyFilter,
        ),
      )
      .map((p) => p.id),
  )

  // Include orphan tasks under synthetic "Utan projektkoppling"
  const UNASSIGNED = "__unassigned__"
  const groups = new Map<string, typeof input.tasks>()
  for (const t of tasksFiltered) {
    const key = t.project_id && projectIds.has(t.project_id) ? t.project_id : UNASSIGNED
    if (input.projectFilter && key !== input.projectFilter) continue
    const list = groups.get(key) ?? []
    list.push(t)
    groups.set(key, list)
  }

  const projectsOut: DriftPipelineProject[] = []
  const projectMeta = [
    ...input.projects.filter((p) => projectIds.has(p.id)),
    {
      id: UNASSIGNED,
      name: "Utan projektkoppling",
      company: "pact",
      status: "active",
      updated_at: null as string | null,
      deleted_at: null as string | null,
    },
  ]

  for (const p of projectMeta) {
    const tasks = groups.get(p.id) ?? []
    if (tasks.length === 0 && p.id === UNASSIGNED) continue
    if (input.projectFilter && p.id !== input.projectFilter) continue
    // Show project if any task survives OR no owner filter and project has zero matching — skip empty when filtering
    if (tasks.length === 0 && input.ownerFilter) continue
    if (tasks.length === 0 && input.projectFilter) continue
    if (tasks.length === 0) continue

    const company: OpsCompany = p.company === "dirtywine" ? "dirtywine" : "pact"
    const ownerFilterActive = !!input.ownerFilter
    const klarWeekTasks = tasks.filter((t) => isDoneThisWeek(t, now))
    const olderTasks = tasks.filter((t) => isDoneOlderWithin30Days(t, now))
    const pagarTasks = tasks.filter((t) => classifyDriftColumn(t, now) === "pagar")
    const pagangTasks = tasks.filter((t) => classifyDriftColumn(t, now) === "pagang")
    const backlogTasks = tasks.filter(
      (t) => classifyDriftColumn(t, now) === "backlog",
    )
    const cancelled = tasks.filter(
      (t) => classifyDriftColumn(t, now) === "cancelled",
    ).length

    const lastStamp = [
      p.updated_at,
      ...tasks.map((t) => t.completed_at ?? t.updated_at),
    ]
      .filter(Boolean)
      .sort()
      .at(-1) as string | undefined

    projectsOut.push({
      id: p.id,
      name: p.name,
      company,
      companyLabel: formatOpsCompanyLabel(company),
      archived: p.status === "archived",
      counts: {
        pagar: pagarTasks.length,
        pagang: pagangTasks.length,
        backlog: backlogTasks.length,
        klartWeek: klarWeekTasks.length,
        older: ownerFilterActive ? 0 : olderTasks.length,
        cancelled: ownerFilterActive ? 0 : cancelled,
      },
      lastActivityLabel: lastStamp
        ? formatStockholmDateTime(lastStamp)
        : null,
      columns: {
        klart: klarWeekTasks
          .sort((a, b) => doneSortKey(b).localeCompare(doneSortKey(a)))
          .map((t) => toCard(t, p.name)),
        klartOlder: ownerFilterActive
          ? []
          : olderTasks
              .sort((a, b) => doneSortKey(b).localeCompare(doneSortKey(a)))
              .map((t) => toCard(t, p.name)),
        pagar: pagarTasks.map((t) => toCard(t, p.name)),
        pagang: pagangTasks.map((t) => toCard(t, p.name)),
        backlog: backlogTasks.map((t) => toCard(t, p.name)),
      },
    })
  }

  projectsOut.sort((a, b) => a.name.localeCompare(b.name, "sv"))

  const ownerOptions = Array.from(
    new Set(
      input.agents
        .filter((a) => a.active !== false)
        .map((a) => a.name)
        .concat(
          ...input.tasks.flatMap((t) => taskOwnerNames(t)),
        ),
    ),
  ).sort((a, b) => a.localeCompare(b, "sv"))

  const projectOptions = input.projects
    .filter((p) => !p.deleted_at)
    .filter((p) =>
      companyOk(
        p.company === "dirtywine" ? "dirtywine" : "pact",
        input.companyFilter,
      ),
    )
    .map((p) => ({ id: p.id, name: p.name }))
    .sort((a, b) => a.name.localeCompare(b.name, "sv"))

  return {
    generatedAtLabel: formatStockholmDateTime(now.toISOString()),
    summary: {
      waiting: queueItems.length,
      waitingOverdue,
      pagar,
      pagang,
      klartWeek,
    },
    queue: queueItems,
    weekItems,
    bots,
    projects: projectsOut,
    ownerOptions,
    projectOptions,
  }
}

export function formatQueueDeadlineLabel(
  deadline: string | null,
  overdue: boolean,
): string {
  if (!deadline) return ""
  const label = formatStockholmDate(deadline)
  return overdue ? `Förfallen ${label}` : label
}
