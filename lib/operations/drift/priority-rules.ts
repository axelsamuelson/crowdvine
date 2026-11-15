import { classifyDriftColumn, isPausedTitle, type DriftTaskLike } from "./column-rules"

export type DriftPriority = "urgent" | "high" | "medium" | "low"
export type DriftCompany = "pact" | "dirtywine"

export interface DriftObjectiveLike {
  id: string
  title: string
  company: DriftCompany
  sort_order: number
  priority: DriftPriority
  owner?: string | null
  short_label?: string | null
  deleted_at?: string | null
}

export interface DriftInitiativeLike {
  id: string
  objective_id: string
  company: DriftCompany
  key: string
  title: string
  owner_agent: string
  sort_order: number
  status?: string | null
}

export interface DriftTaskWithLinks extends DriftTaskLike {
  objective_id?: string | null
  initiative_id?: string | null
  project_id?: string | null
  sort_order?: number | null
}

/** Task lacks objective or initiative → Ej prioriterad (yellow). */
export function isUnprioritized(task: {
  objective_id?: string | null
  initiative_id?: string | null
}): boolean {
  return !task.objective_id || !task.initiative_id
}

/**
 * Rule broken (red): in_progress without initiative.
 * Objective alone is not enough — initiative is required to start.
 */
export function isStartedWithoutInitiative(task: {
  status: string
  title: string
  initiative_id?: string | null
}): boolean {
  if (isPausedTitle(task.title) || task.status === "paused") return false
  if (task.status !== "in_progress") return false
  return !task.initiative_id
}

export function companyOwnerLabel(company: DriftCompany): string {
  return company === "dirtywine" ? "Léa" : "Pierre"
}

export function companySubtitle(company: DriftCompany): string {
  if (company === "dirtywine") return "Dirty Wine · ägs av Léa"
  return "PACT · ägs av Pierre"
}

export function formatPriorityLabel(priority: DriftPriority | string | null | undefined): string {
  switch (priority) {
    case "urgent":
      return "Brådskande"
    case "high":
      return "Hög"
    case "medium":
      return "Medel"
    case "low":
      return "Låg"
    default:
      return "—"
  }
}

/**
 * Rank key for ordering within an objective:
 * initiative.sort_order, then task.sort_order, then title.
 */
export function taskRankTuple(
  task: DriftTaskWithLinks,
  initiativeById: Map<string, DriftInitiativeLike>,
): [number, number, string] {
  const initiative = task.initiative_id
    ? initiativeById.get(task.initiative_id)
    : undefined
  const initiativeOrder = initiative?.sort_order ?? Number.MAX_SAFE_INTEGER
  const taskOrder = task.sort_order ?? 0
  return [initiativeOrder, taskOrder, task.title]
}

export function compareTaskRank(
  a: DriftTaskWithLinks,
  b: DriftTaskWithLinks,
  initiativeById: Map<string, DriftInitiativeLike>,
): number {
  const ta = taskRankTuple(a, initiativeById)
  const tb = taskRankTuple(b, initiativeById)
  if (ta[0] !== tb[0]) return ta[0] - tb[0]
  if (ta[1] !== tb[1]) return ta[1] - tb[1]
  return ta[2].localeCompare(tb[2], "sv")
}

/**
 * "↑ Pågår under rang" when an in_progress task has todo tasks ranked
 * earlier in the same objective (initiative first, then place).
 */
export function isBelowRankInObjective(input: {
  task: DriftTaskWithLinks
  siblingsInObjective: DriftTaskWithLinks[]
  initiativeById: Map<string, DriftInitiativeLike>
  now?: Date
}): boolean {
  const { task, siblingsInObjective, initiativeById, now } = input
  if (task.status !== "in_progress" || isPausedTitle(task.title)) return false
  if (!task.objective_id) return false

  const myRank = taskRankTuple(task, initiativeById)

  for (const sibling of siblingsInObjective) {
    if (sibling.id === task.id) continue
    if (sibling.objective_id !== task.objective_id) continue
    if (sibling.deleted_at || sibling.parent_task_id) continue
    const col = classifyDriftColumn(sibling, now)
    if (col !== "pagang" && sibling.status !== "todo") continue
    // Only count open todos (På gång or backlog todo), not paused/done
    if (sibling.status !== "todo") continue
    if (isPausedTitle(sibling.title)) continue

    const theirRank = taskRankTuple(sibling, initiativeById)
    const earlier =
      theirRank[0] < myRank[0] ||
      (theirRank[0] === myRank[0] && theirRank[1] < myRank[1]) ||
      (theirRank[0] === myRank[0] &&
        theirRank[1] === myRank[1] &&
        theirRank[2].localeCompare(myRank[2], "sv") < 0)
    if (earlier) return true
  }
  return false
}

/**
 * Bot filter: show task if bot executes it (owner_agent) OR is responsible
 * for its initiative (owner_agent on initiative).
 */
export function taskMatchesBotFilter(
  task: DriftTaskWithLinks,
  botFilter: string | null | undefined,
  initiativeById: Map<string, DriftInitiativeLike>,
  ownerNames: (t: DriftTaskWithLinks) => string[],
): boolean {
  if (!botFilter) return true
  const needle = botFilter.toLowerCase()
  const executors = ownerNames(task).map((n) => n.toLowerCase())
  if (executors.includes(needle)) return true
  const initiative = task.initiative_id
    ? initiativeById.get(task.initiative_id)
    : undefined
  if (initiative?.owner_agent.toLowerCase() === needle) return true
  return false
}

export function resolveTaskCompany(input: {
  task: DriftTaskWithLinks
  objectiveById: Map<string, DriftObjectiveLike>
  initiativeById: Map<string, DriftInitiativeLike>
  projectCompanyById: Map<string, DriftCompany>
}): DriftCompany {
  const { task, objectiveById, initiativeById, projectCompanyById } = input
  if (task.objective_id) {
    const obj = objectiveById.get(task.objective_id)
    if (obj) return obj.company
  }
  if (task.initiative_id) {
    const init = initiativeById.get(task.initiative_id)
    if (init) return init.company
  }
  if (task.project_id) {
    return projectCompanyById.get(task.project_id) ?? "pact"
  }
  return "pact"
}
