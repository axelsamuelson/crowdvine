import { parseTaskSourceMarker } from "@/lib/operations/ops-agents"
import {
  classifyDriftColumn,
  doneSortKey,
  isDoneThisWeek,
  isPausedTitle,
  taskOwnerNames,
  type DriftTaskLike,
} from "./column-rules"
import {
  deriveDriftTaskBadge,
  extractPrUrlFromDescription,
  formatDriftTaskHeadingLine,
  stripDescriptionForPanel,
} from "./display-title"
import {
  companySubtitle,
  compareTaskRank,
  formatPriorityLabel,
  isBelowRankInObjective,
  isStartedWithoutInitiative,
  isUnprioritized,
  resolveTaskCompany,
  taskMatchesBotFilter,
  type DriftCompany,
  type DriftInitiativeLike,
  type DriftObjectiveLike,
  type DriftTaskWithLinks,
} from "./priority-rules"
import {
  formatStockholmDate,
  formatStockholmDateTime,
  stockholmYmd,
} from "./stockholm-time"
import type {
  DriftCompanyFilter,
  DriftMalInitiative,
  DriftMalObjective,
  DriftMalTaskRow,
  DriftOverviewData,
  DriftPagarTask,
  DriftPipelineObjective,
  DriftPipelineTaskCard,
  DriftQueueItem,
  DriftTaskDetail,
  DriftUnprioritizedTask,
  DriftWeekItem,
} from "./types"

export interface DriftBuildInput {
  now?: Date
  companyFilter: DriftCompanyFilter
  ownerFilter?: string | null
  objectives: DriftObjectiveLike[]
  initiatives: DriftInitiativeLike[]
  tasks: Array<
    DriftTaskLike & {
      objective_id?: string | null
      initiative_id?: string | null
      project_id?: string | null
      sort_order?: number | null
      description?: string | null
      task_points?: number | null
      points_status?: "proposed" | "confirmed" | null
    }
  >
  agents: Array<{ name: string; active?: boolean | null }>
  queue: Array<{
    id: string
    agent: string
    kind?: string | null
    title: string
    question?: string | null
    detail?: string | null
    recommendation?: string | null
    deadline?: string | null
    status: string
    created_at?: string | null
    company?: string | null
    project_id?: string | null
    task_id?: string | null
  }>
  projectCompanyById?: Map<string, DriftCompany>
}

function statusLabelForTask(task: DriftTaskLike, now: Date): string {
  if (isPausedTitle(task.title) || task.status === "paused") return "Pausad"
  const col = classifyDriftColumn(task, now)
  switch (col) {
    case "pagar":
      return "Pågår"
    case "pagang":
    case "backlog":
      return "Nästa"
    case "klart":
      return "Klart"
    case "cancelled":
      return "Avbruten"
    default:
      return task.status
  }
}

function detailDateLabel(task: DriftTaskLike, now: Date): string {
  const col = classifyDriftColumn(task, now)
  if (col === "klart") {
    const stamp = task.completed_at ?? task.updated_at
    return stamp ? formatStockholmDateTime(stamp) : "—"
  }
  if (task.due_date) return formatStockholmDate(task.due_date)
  return "—"
}

function objectiveChip(
  obj: DriftObjectiveLike | undefined,
): DriftPagarTask["objective"] {
  if (!obj) return null
  return {
    id: obj.id,
    rank: obj.sort_order,
    shortLabel: obj.short_label?.trim() || obj.title,
    title: obj.title,
  }
}

function initiativeTag(
  init: DriftInitiativeLike | undefined,
): DriftPagarTask["initiative"] {
  if (!init) return null
  return {
    id: init.id,
    key: init.key,
    title: init.title,
  }
}

function toDetail(
  task: DriftTaskWithLinks & { description?: string | null },
  objective: DriftObjectiveLike | undefined,
  initiative: DriftInitiativeLike | undefined,
  now: Date,
): DriftTaskDetail {
  const owners = taskOwnerNames(task)
  const marker = parseTaskSourceMarker(task.description)
  const prNumber = marker?.kind === "pr" ? marker.prNumber : null
  const unprioritized = isUnprioritized(task)
  return {
    id: task.id,
    heading: formatDriftTaskHeadingLine(task, objective?.title ?? null),
    description: stripDescriptionForPanel(task.description),
    owner: owners[0] ?? null,
    initiativeOwner: initiative?.owner_agent ?? null,
    objectiveId: objective?.id ?? null,
    objectiveLabel: objective
      ? `${objective.sort_order} ${objective.short_label?.trim() || objective.title}`
      : null,
    initiativeId: initiative?.id ?? null,
    initiativeLabel: initiative ? `${initiative.key} ${initiative.title}` : null,
    priorityLabel: objective ? formatPriorityLabel(objective.priority) : null,
    sortOrderLabel:
      task.sort_order != null && task.initiative_id
        ? String(task.sort_order)
        : null,
    statusLabel: statusLabelForTask(task, now),
    dateLabel: detailDateLabel(task, now),
    prNumber,
    prUrl: prNumber ? extractPrUrlFromDescription(task.description) : null,
    unprioritized,
    startedWithoutInitiative: isStartedWithoutInitiative(task),
  }
}

function toPipelineCard(
  task: DriftTaskWithLinks & { description?: string | null },
  objective: DriftObjectiveLike | undefined,
  initiative: DriftInitiativeLike | undefined,
  waitingQueueTaskIds: Set<string>,
  now: Date,
  belowRank: boolean,
): DriftPipelineTaskCard {
  const marker = parseTaskSourceMarker(task.description)
  const owners = taskOwnerNames(task)
  const done = task.status === "done"
  const atLabel = done
    ? task.completed_at
      ? formatStockholmDateTime(task.completed_at)
      : task.updated_at
        ? formatStockholmDateTime(task.updated_at)
        : null
    : task.due_date
      ? formatStockholmDate(task.due_date)
      : task.updated_at
        ? formatStockholmDateTime(task.updated_at)
        : null
  return {
    id: task.id,
    heading: formatDriftTaskHeadingLine(task, objective?.title ?? null),
    owner: owners[0] ?? null,
    atLabel,
    atIsDone: done,
    source: marker?.kind ?? null,
    paused: isPausedTitle(task.title),
    unprioritized: isUnprioritized(task),
    startedWithoutInitiative: isStartedWithoutInitiative(task),
    belowRank,
    badge: deriveDriftTaskBadge({
      status: task.status,
      title: task.title,
      description: task.description,
      waitingQueueTaskIds,
      taskId: task.id,
    }),
    href: `/admin/operations/tasks/${task.id}`,
    detail: toDetail(task, objective, initiative, now),
  }
}

function malStatus(
  task: DriftTaskWithLinks,
  now: Date,
): DriftMalTaskRow["status"] {
  if (isPausedTitle(task.title) || task.status === "paused") return "pausad"
  if (task.status === "done") return "klart"
  if (task.status === "in_progress") return "pagar"
  return "nasta"
}

export function buildDriftOverview(input: DriftBuildInput): DriftOverviewData {
  const now = input.now ?? new Date()
  const today = stockholmYmd(now)
  const company = input.companyFilter
  const projectCompanyById = input.projectCompanyById ?? new Map()

  /** All objectives (any company) — needed so company resolution does not fall back wrongly. */
  const allObjectiveById = new Map<string, DriftObjectiveLike>()
  const objectiveById = new Map<string, DriftObjectiveLike>()
  for (const o of input.objectives) {
    if (o.deleted_at) continue
    allObjectiveById.set(o.id, o)
    if (o.company === company) objectiveById.set(o.id, o)
  }

  const allInitiativeById = new Map<string, DriftInitiativeLike>()
  const initiativeById = new Map<string, DriftInitiativeLike>()
  for (const i of input.initiatives) {
    allInitiativeById.set(i.id, i)
    if (i.company !== company) continue
    if (!objectiveById.has(i.objective_id)) continue
    initiativeById.set(i.id, i)
  }

  const tasksInCompany = input.tasks.filter((t) => {
    if (t.deleted_at) return false
    if (t.parent_task_id) return false
    return (
      resolveTaskCompany({
        task: t,
        objectiveById: allObjectiveById,
        initiativeById: allInitiativeById,
        projectCompanyById,
      }) === company
    )
  })

  const tasksFiltered = tasksInCompany.filter((t) =>
    taskMatchesBotFilter(t, input.ownerFilter, initiativeById, taskOwnerNames),
  )

  const queueInCompany = input.queue.filter((q) => {
    if (q.status !== "väntar") return false
    const c =
      q.company === "pact" || q.company === "dirtywine"
        ? q.company
        : q.project_id
          ? (projectCompanyById.get(q.project_id) ?? "pact")
          : "pact"
    return c === company
  })

  const waitingQueueTaskIds = new Set(
    queueInCompany.map((q) => q.task_id).filter((id): id is string => !!id),
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
    openHref: `/admin/operations?company=${company}&godkannande=${q.id}`,
  }))

  let pagar = 0
  let pagang = 0
  let klartWeek = 0
  let unprioritizedCount = 0
  let withoutPointsCount = 0
  for (const t of tasksFiltered) {
    if (isUnprioritized(t) && t.status !== "cancelled") unprioritizedCount += 1
    const paused = isPausedTitle(t.title) || t.status === "paused"
    if (
      !paused &&
      t.status !== "cancelled" &&
      !isUnprioritized(t) &&
      t.task_points == null
    ) {
      withoutPointsCount += 1
    }
    if (t.status === "in_progress" && !isPausedTitle(t.title)) pagar += 1
    else if (
      t.status !== "done" &&
      t.status !== "cancelled" &&
      t.status !== "paused" &&
      !isPausedTitle(t.title)
    ) {
      const col = classifyDriftColumn(t, now)
      // "Nästa" covers former På gång + backlog todos
      if (col === "pagang" || col === "backlog") pagang += 1
    } else if (t.status === "done" && isDoneThisWeek(t, now)) klartWeek += 1
  }

  const siblingsByObjective = new Map<string, DriftTaskWithLinks[]>()
  for (const t of tasksInCompany) {
    if (!t.objective_id) continue
    const list = siblingsByObjective.get(t.objective_id) ?? []
    list.push(t)
    siblingsByObjective.set(t.objective_id, list)
  }

  const pagarRaw = tasksFiltered
    .filter((t) => t.status === "in_progress" && !isPausedTitle(t.title))
    .sort((a, b) => {
      const oa = a.objective_id ? objectiveById.get(a.objective_id) : undefined
      const ob = b.objective_id ? objectiveById.get(b.objective_id) : undefined
      const ra = oa?.sort_order ?? Number.MAX_SAFE_INTEGER
      const rb = ob?.sort_order ?? Number.MAX_SAFE_INTEGER
      if (ra !== rb) return ra - rb
      return compareTaskRank(a, b, initiativeById)
    })

  const pagarTasks: DriftPagarTask[] = pagarRaw.map((t) => {
    const objective = t.objective_id
      ? objectiveById.get(t.objective_id)
      : undefined
    const initiative = t.initiative_id
      ? initiativeById.get(t.initiative_id)
      : undefined
    const siblings = t.objective_id
      ? (siblingsByObjective.get(t.objective_id) ?? [])
      : []
    const belowRank = isBelowRankInObjective({
      task: t,
      siblingsInObjective: siblings,
      initiativeById,
      now,
    })
    const owners = taskOwnerNames(t)
    return {
      id: t.id,
      heading: formatDriftTaskHeadingLine(t, objective?.title ?? null),
      owner: owners[0] ?? null,
      objective: objectiveChip(objective),
      initiative: initiativeTag(initiative),
      dateLabel: t.due_date ? formatStockholmDate(t.due_date) : null,
      badge: deriveDriftTaskBadge({
        status: t.status,
        title: t.title,
        description: t.description,
        waitingQueueTaskIds,
        taskId: t.id,
      }),
      belowRank,
      belowRankLabel: belowRank
        ? `↑ Pågår under rang${t.due_date ? ` ${formatStockholmDate(t.due_date)}` : ""}`
        : null,
      unprioritized: isUnprioritized(t),
      startedWithoutInitiative: isStartedWithoutInitiative(t),
      detail: toDetail(t, objective, initiative, now),
    }
  })

  const weekCandidates = tasksFiltered
    .filter((t) => isDoneThisWeek(t, now))
    .sort((a, b) => doneSortKey(b).localeCompare(doneSortKey(a)))
    .slice(0, 8)

  const weekItems: DriftWeekItem[] = weekCandidates.map((t) => {
    const objective = t.objective_id
      ? objectiveById.get(t.objective_id)
      : undefined
    const initiative = t.initiative_id
      ? initiativeById.get(t.initiative_id)
      : undefined
    const marker = parseTaskSourceMarker(t.description)
    const owners = taskOwnerNames(t)
    const at = t.completed_at ?? t.updated_at ?? ""
    return {
      id: t.id,
      heading: formatDriftTaskHeadingLine(t, objective?.title ?? null),
      owner: owners[0] ?? null,
      at,
      atLabel: formatStockholmDateTime(at),
      source: marker?.kind ?? null,
      objective: objectiveChip(objective),
      initiative: initiativeTag(initiative),
      unprioritized: isUnprioritized(t),
      detail: toDetail(t, objective, initiative, now),
    }
  })

  const unprioritizedRaw = tasksFiltered.filter(
    (t) =>
      isUnprioritized(t) &&
      t.status !== "cancelled" &&
      t.status !== "done",
  )

  const unprioritizedTasks: DriftUnprioritizedTask[] = unprioritizedRaw
    .sort((a, b) => {
      const aRed = isStartedWithoutInitiative(a) ? 0 : 1
      const bRed = isStartedWithoutInitiative(b) ? 0 : 1
      if (aRed !== bRed) return aRed - bRed
      return a.title.localeCompare(b.title, "sv")
    })
    .map((t) => {
      const objective = t.objective_id
        ? objectiveById.get(t.objective_id)
        : undefined
      const initiative = t.initiative_id
        ? initiativeById.get(t.initiative_id)
        : undefined
      const owners = taskOwnerNames(t)
      return {
        id: t.id,
        heading: formatDriftTaskHeadingLine(t, objective?.title ?? null),
        owner: owners[0] ?? null,
        statusLabel: statusLabelForTask(t, now),
        startedWithoutInitiative: isStartedWithoutInitiative(t),
        objectiveLabel: objective
          ? `${objective.sort_order} ${objective.short_label?.trim() || objective.title}`
          : null,
        detail: toDetail(t, objective, initiative, now),
      }
    })

  const startedWithout = unprioritizedTasks.filter(
    (t) => t.startedWithoutInitiative,
  )

  const withoutPointsTasks: DriftUnprioritizedTask[] = tasksFiltered
    .filter((t) => {
      if (t.status === "cancelled") return false
      if (isPausedTitle(t.title) || t.status === "paused") return false
      if (isUnprioritized(t)) return false
      return t.task_points == null
    })
    .sort((a, b) => a.title.localeCompare(b.title, "sv"))
    .map((t) => {
      const objective = t.objective_id
        ? objectiveById.get(t.objective_id)
        : undefined
      const initiative = t.initiative_id
        ? initiativeById.get(t.initiative_id)
        : undefined
      const owners = taskOwnerNames(t)
      return {
        id: t.id,
        heading: formatDriftTaskHeadingLine(t, objective?.title ?? null),
        owner: owners[0] ?? null,
        statusLabel: statusLabelForTask(t, now),
        startedWithoutInitiative: isStartedWithoutInitiative(t),
        objectiveLabel: objective
          ? `${objective.sort_order} ${objective.short_label?.trim() || objective.title}`
          : null,
        detail: toDetail(t, objective, initiative, now),
      }
    })

  const sortedObjectives = Array.from(objectiveById.values()).sort(
    (a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title, "sv"),
  )

  const initiativesByObjective = new Map<string, DriftInitiativeLike[]>()
  for (const i of initiativeById.values()) {
    const list = initiativesByObjective.get(i.objective_id) ?? []
    list.push(i)
    initiativesByObjective.set(i.objective_id, list)
  }
  for (const list of initiativesByObjective.values()) {
    list.sort(
      (a, b) => a.sort_order - b.sort_order || a.key.localeCompare(b.key, "sv"),
    )
  }

  function buildMalTaskRow(
    t: DriftTaskWithLinks & { description?: string | null },
    place: number,
    objective: DriftObjectiveLike,
    initiative: DriftInitiativeLike,
  ): DriftMalTaskRow {
    const siblings = siblingsByObjective.get(objective.id) ?? []
    const belowRank = isBelowRankInObjective({
      task: t,
      siblingsInObjective: siblings,
      initiativeById,
      now,
    })
    const status = malStatus(t, now)
    const owners = taskOwnerNames(t)
    return {
      id: t.id,
      place,
      heading: formatDriftTaskHeadingLine(t, objective.title),
      owner: owners[0] ?? null,
      status,
      statusLabel:
        status === "pagar"
          ? "Pågår"
          : status === "nasta"
            ? "Nästa"
            : status === "pausad"
              ? "Pausad"
              : "Klart",
      badge: deriveDriftTaskBadge({
        status: t.status,
        title: t.title,
        description: t.description,
        waitingQueueTaskIds,
        taskId: t.id,
      }),
      belowRank,
      unprioritized: isUnprioritized(t),
      startedWithoutInitiative: isStartedWithoutInitiative(t),
      detail: toDetail(t, objective, initiative, now),
    }
  }

  const malObjectives: DriftMalObjective[] = sortedObjectives.map((obj) => {
    const initiatives = initiativesByObjective.get(obj.id) ?? []
    const objTasksFiltered = tasksFiltered.filter(
      (t) => t.objective_id === obj.id,
    )
    // Klart-mätare follows bot filter (same scope as header counts).
    const totalCount = objTasksFiltered.filter(
      (t) => t.status !== "cancelled",
    ).length
    const doneCount = objTasksFiltered.filter((t) => t.status === "done").length
    const pagarCount = objTasksFiltered.filter(
      (t) => t.status === "in_progress" && !isPausedTitle(t.title),
    ).length

    const botNeedle = input.ownerFilter?.toLowerCase() ?? null

    const malInitiatives: DriftMalInitiative[] = initiatives
      .map((init) => {
        const initTasks = tasksFiltered
          .filter((t) => t.initiative_id === init.id)
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

        const active = initTasks.filter(
          (t) =>
            t.status !== "done" &&
            t.status !== "cancelled" &&
            !isPausedTitle(t.title) &&
            t.status !== "paused",
        )
        const paused = initTasks.filter(
          (t) => isPausedTitle(t.title) || t.status === "paused",
        )
        const klarWeek = initTasks.filter((t) => isDoneThisWeek(t, now))

        const pagarTasksInit = active.filter((t) => t.status === "in_progress")
        const nastaTasks = active.filter((t) => t.status !== "in_progress")

        const visibleSource = [
          ...pagarTasksInit,
          ...nastaTasks.slice(0, 3),
        ]
        const hiddenTaskCount = Math.max(
          0,
          active.length - visibleSource.length,
        )

        const allActiveRows = active.map((t, idx) =>
          buildMalTaskRow(t, (t.sort_order ?? idx + 1) || idx + 1, obj, init),
        )

        return {
          id: init.id,
          key: init.key,
          title: init.title,
          ownerAgent: init.owner_agent,
          pagarCount: pagarTasksInit.length,
          nastaCount: nastaTasks.length,
          klartWeekCount: klarWeek.length,
          pausedCount: paused.length,
          visibleTasks: visibleSource.map((t, idx) =>
            buildMalTaskRow(t, (t.sort_order ?? idx + 1) || idx + 1, obj, init),
          ),
          hiddenTaskCount,
          allTasks: allActiveRows,
        }
      })
      .filter((init) => {
        if (!botNeedle) return true
        // Keep if bot is ansvarig or has any task (incl. done/paused) in scope.
        if (init.ownerAgent.toLowerCase() === botNeedle) return true
        return (
          init.visibleTasks.length > 0 ||
          init.hiddenTaskCount > 0 ||
          init.klartWeekCount > 0 ||
          init.pausedCount > 0
        )
      })

    const hiddenInitiativesCount = Math.max(
      0,
      initiatives.length - malInitiatives.length,
    )

    const emptyForFilter =
      !!input.ownerFilter &&
      malInitiatives.length === 0 &&
      hiddenInitiativesCount === 0

    return {
      id: obj.id,
      rank: obj.sort_order,
      title: obj.title,
      shortLabel: obj.short_label?.trim() || obj.title,
      priority: obj.priority,
      priorityLabel: formatPriorityLabel(obj.priority),
      initiativeCount: initiatives.length,
      hiddenInitiativesCount,
      pagarCount,
      doneCount,
      totalCount,
      defaultExpanded: obj.sort_order <= 3,
      emptyForFilter,
      initiatives: malInitiatives,
    }
  })

  const unprioritizedForPipeline = tasksFiltered.filter(
    (t) => isUnprioritized(t) && t.status !== "cancelled",
  )

  const pipelineUnprioritized = {
    pagar: unprioritizedForPipeline
      .filter((t) => t.status === "in_progress" && !isPausedTitle(t.title))
      .map((t) =>
        toPipelineCard(
          t,
          t.objective_id ? objectiveById.get(t.objective_id) : undefined,
          undefined,
          waitingQueueTaskIds,
          now,
          false,
        ),
      ),
    pagang: unprioritizedForPipeline
      .filter((t) => classifyDriftColumn(t, now) === "pagang" || (t.status === "todo" && !isPausedTitle(t.title)))
      .filter((t) => t.status !== "in_progress" && t.status !== "done")
      .map((t) =>
        toPipelineCard(
          t,
          t.objective_id ? objectiveById.get(t.objective_id) : undefined,
          undefined,
          waitingQueueTaskIds,
          now,
          false,
        ),
      ),
    klart: unprioritizedForPipeline
      .filter((t) => isDoneThisWeek(t, now))
      .sort((a, b) => doneSortKey(b).localeCompare(doneSortKey(a)))
      .slice(0, 3)
      .map((t) =>
        toPipelineCard(
          t,
          t.objective_id ? objectiveById.get(t.objective_id) : undefined,
          undefined,
          waitingQueueTaskIds,
          now,
          false,
        ),
      ),
  }

  const pipelineObjectives: DriftPipelineObjective[] = sortedObjectives.map(
    (obj) => {
      const initiatives = initiativesByObjective.get(obj.id) ?? []
      const objTasks = tasksFiltered.filter((t) => t.objective_id === obj.id)
      const pagarN = objTasks.filter(
        (t) => t.status === "in_progress" && !isPausedTitle(t.title),
      ).length
      const pagangN = objTasks.filter((t) => {
        if (t.status === "done" || t.status === "cancelled") return false
        if (t.status === "in_progress") return false
        if (isPausedTitle(t.title) || t.status === "paused") return false
        const col = classifyDriftColumn(t, now)
        return col === "pagang" || col === "backlog"
      }).length
      const klartN = objTasks.filter((t) => isDoneThisWeek(t, now)).length

      const pipeInitiatives = initiatives.map((init) => {
        const initTasks = tasksFiltered.filter(
          (t) => t.initiative_id === init.id,
        )
        const siblings = siblingsByObjective.get(obj.id) ?? []
        const pagarCards = initTasks
          .filter((t) => t.status === "in_progress" && !isPausedTitle(t.title))
          .map((t) =>
            toPipelineCard(
              t,
              obj,
              init,
              waitingQueueTaskIds,
              now,
              isBelowRankInObjective({
                task: t,
                siblingsInObjective: siblings,
                initiativeById,
                now,
              }),
            ),
          )
        const pagangCards = initTasks
          .filter((t) => {
            if (t.status === "done" || t.status === "cancelled") return false
            if (t.status === "in_progress") return false
            if (isPausedTitle(t.title) || t.status === "paused") return false
            return true
          })
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .slice(0, 4)
          .map((t) =>
            toPipelineCard(t, obj, init, waitingQueueTaskIds, now, false),
          )
        const klartCards = initTasks
          .filter((t) => isDoneThisWeek(t, now))
          .sort((a, b) => doneSortKey(b).localeCompare(doneSortKey(a)))
          .slice(0, 3)
          .map((t) =>
            toPipelineCard(t, obj, init, waitingQueueTaskIds, now, false),
          )

        return {
          id: init.id,
          key: init.key,
          title: init.title,
          ownerAgent: init.owner_agent,
          columns: {
            pagar: pagarCards,
            pagang: pagangCards,
            klart: klartCards,
          },
        }
      })

      return {
        id: obj.id,
        rank: obj.sort_order,
        title: obj.title,
        shortLabel: obj.short_label?.trim() || obj.title,
        defaultExpanded: obj.sort_order <= 2,
        summaryLine: `${initiatives.length} initiativ · Pågår ${pagarN} · Nästa ${pagangN} · Klart ${klartN} den här veckan`,
        initiatives: pipeInitiatives,
      }
    },
  )

  const ownerOptions = Array.from(
    new Set([
      ...input.agents
        .filter((a) => a.active !== false)
        .map((a) => a.name),
      ...input.initiatives.map((i) => i.owner_agent),
      ...input.tasks.flatMap((t) => taskOwnerNames(t)),
    ]),
  ).sort((a, b) => a.localeCompare(b, "sv"))

  return {
    generatedAtLabel: formatStockholmDateTime(now.toISOString()),
    company,
    companySubtitle: companySubtitle(company),
    summary: {
      waiting: queueItems.length,
      waitingOverdue: queueItems.filter((q) => q.overdue).length,
      pagar,
      pagang,
      klartWeek,
      unprioritized: unprioritizedCount,
      withoutPoints: withoutPointsCount,
    },
    queue: queueItems,
    pagarTasks,
    weekItems,
    unprioritizedTasks,
    withoutPointsTasks,
    startedWithoutInitiativeCount: startedWithout.length,
    startedWithoutInitiativePreview: startedWithout[0] ?? null,
    malObjectives,
    pipelineUnprioritized,
    pipelineObjectives,
    ownerOptions,
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

