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
import {
  deriveDriftTaskBadge,
  extractPrUrlFromDescription,
  formatDriftTaskHeadingLine,
  formatProjectTagLabel,
  stripDescriptionForPanel,
} from "./display-title"
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
  DriftPagarBotGroup,
  DriftPagarTask,
  DriftPipelineProject,
  DriftPipelineTaskCard,
  DriftQueueItem,
  DriftTaskDetail,
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
      task_id?: string | null
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

function statusLabelForTask(
  task: DriftTaskLike,
  now: Date,
): string {
  const col = classifyDriftColumn(task, now)
  switch (col) {
    case "pagar":
      return "Pågår"
    case "pagang":
      return "På gång"
    case "backlog":
      return "Backlog"
    case "klart":
      return "Klart"
    case "cancelled":
      return "Avbruten"
    default:
      return task.status
  }
}

function detailDateLabel(
  task: DriftTaskLike,
  now: Date,
): string {
  const col = classifyDriftColumn(task, now)
  if (col === "klart") {
    const stamp = task.completed_at ?? task.updated_at
    return stamp ? formatStockholmDateTime(stamp) : "—"
  }
  if (task.due_date) return formatStockholmDate(task.due_date)
  return "—"
}

function toDetail(
  task: DriftTaskLike & { description?: string | null; project_id?: string | null },
  projectName: string | null,
  now: Date,
): DriftTaskDetail {
  const owners = taskOwnerNames(task)
  const marker = parseTaskSourceMarker(task.description)
  const prNumber = marker?.kind === "pr" ? marker.prNumber : null
  return {
    id: task.id,
    heading: formatDriftTaskHeadingLine(task, projectName),
    description: stripDescriptionForPanel(task.description),
    owner: owners[0] ?? null,
    projectId: task.project_id ?? null,
    projectName: projectName ? formatProjectTagLabel(projectName) : null,
    statusLabel: statusLabelForTask(task, now),
    dateLabel: detailDateLabel(task, now),
    prNumber,
    prUrl: prNumber ? extractPrUrlFromDescription(task.description) : null,
  }
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

function ownerGroupKey(task: DriftTaskLike): { key: string; label: string } {
  const owners = taskOwnerNames(task)
  if (owners.length === 0) return { key: "__none__", label: "Utan ägare" }
  // Preserve shared ownership as a single group label (e.g. Margaux/Saga)
  const label = owners.join("/")
  return { key: label.toLowerCase(), label }
}

export function buildDriftOverview(input: DriftBuildInput): DriftOverviewData {
  const now = input.now ?? new Date()
  const today = stockholmYmd(now)
  const projectCompanyById = new Map<string, OpsCompany>()
  const projectNameById = new Map<string, string>()
  for (const p of input.projects) {
    if (p.deleted_at) continue
    projectCompanyById.set(
      p.id,
      p.company === "dirtywine" ? "dirtywine" : "pact",
    )
    projectNameById.set(p.id, p.name)
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

  const waitingQueueTaskIds = new Set(
    queueInCompany
      .map((q) => q.task_id)
      .filter((id): id is string => !!id),
  )

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
    // Summary «Pågår» = in_progress without [PAUSAD] (v4.1)
    if (t.status === "in_progress" && !isPausedTitle(t.title)) pagar += 1
    else if (col === "pagang") pagang += 1
    else if (col === "klart" && isDoneThisWeek(t, now)) klartWeek += 1
  }

  // Pågår per bot: in_progress without [PAUSAD]
  const pagarTasks = tasksFiltered.filter(
    (t) => t.status === "in_progress" && !isPausedTitle(t.title),
  )

  const pagarByOwner = new Map<string, DriftPagarTask[]>()
  const ownerLabels = new Map<string, string>()
  for (const t of pagarTasks) {
    const { key, label } = ownerGroupKey(t)
    ownerLabels.set(key, label)
    const projectName = t.project_id
      ? (projectNameById.get(t.project_id) ?? null)
      : null
    const badge = deriveDriftTaskBadge({
      status: t.status,
      title: t.title,
      description: t.description,
      waitingQueueTaskIds,
      taskId: t.id,
    })
    const item: DriftPagarTask = {
      id: t.id,
      heading: formatDriftTaskHeadingLine(t, projectName),
      projectTag: formatProjectTagLabel(projectName),
      dateLabel: t.due_date ? formatStockholmDate(t.due_date) : null,
      badge,
      detail: toDetail(t, projectName, now),
    }
    const list = pagarByOwner.get(key) ?? []
    list.push(item)
    pagarByOwner.set(key, list)
  }

  const pagarGroups: DriftPagarBotGroup[] = Array.from(pagarByOwner.entries())
    .map(([key, tasks]) => ({
      ownerKey: key,
      ownerLabel: ownerLabels.get(key) ?? key,
      count: tasks.length,
      hasWaitingForYou: tasks.some((t) => t.badge === "waiting_for_you"),
      tasks,
    }))
    .sort((a, b) => {
      if (a.ownerKey === "__none__") return 1
      if (b.ownerKey === "__none__") return -1
      if (a.hasWaitingForYou !== b.hasWaitingForYou) {
        return a.hasWaitingForYou ? -1 : 1
      }
      return a.ownerLabel.localeCompare(b.ownerLabel, "sv")
    })

  const weekCandidates = tasksFiltered
    .filter((t) => isDoneThisWeek(t, now))
    .sort((a, b) => doneSortKey(b).localeCompare(doneSortKey(a)))
    .slice(0, 5)

  const weekItems: DriftWeekItem[] = weekCandidates.map((t) => {
    const projectName = t.project_id
      ? (projectNameById.get(t.project_id) ?? null)
      : null
    const marker = parseTaskSourceMarker(t.description)
    const owners = taskOwnerNames(t)
    const at = t.completed_at ?? t.updated_at ?? ""
    return {
      id: t.id,
      heading: formatDriftTaskHeadingLine(t, projectName),
      owner: owners[0] ?? null,
      at,
      atLabel: formatStockholmDateTime(at),
      source: marker?.kind ?? null,
      projectName,
      projectTag: formatProjectTagLabel(projectName),
      detail: toDetail(t, projectName, now),
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
    if (tasks.length === 0 && input.ownerFilter) continue
    if (tasks.length === 0 && input.projectFilter) continue
    if (tasks.length === 0) continue

    const company: OpsCompany = p.company === "dirtywine" ? "dirtywine" : "pact"
    const ownerFilterActive = !!input.ownerFilter
    const klarWeekTasks = tasks.filter((t) => isDoneThisWeek(t, now))
    const olderTasks = tasks.filter((t) => isDoneOlderWithin30Days(t, now))
    const pagarColTasks = tasks.filter((t) => classifyDriftColumn(t, now) === "pagar")
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
        pagar: pagarColTasks.length,
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
        pagar: pagarColTasks.map((t) => toCard(t, p.name)),
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
    pagarGroups,
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
