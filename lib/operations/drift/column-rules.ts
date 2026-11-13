import {
  stockholmDaysAgoYmd,
  stockholmIsoWeekBounds,
  stockholmYmd,
} from "./stockholm-time"

export type DriftColumn = "pagar" | "pagang" | "backlog" | "klart" | "cancelled"

export interface DriftTaskLike {
  id: string
  title: string
  status: string
  due_date?: string | null
  updated_at?: string | null
  completed_at?: string | null
  deleted_at?: string | null
  parent_task_id?: string | null
  owner_agent?: string | null
  assigned_to?: string | null
  description?: string | null
  project_id?: string | null
}

export function isPausedTitle(title: string): boolean {
  return /\[PAUSAD\]/i.test(title)
}

/** Strip `[Namn]` and `[PAUSAD]` prefixes for display. */
export function cleanTaskTitle(title: string): string {
  return title
    .replace(/^\s*\[PAUSAD\]\s*/i, "")
    .replace(/^\s*\[[^\]]+\]\s*/g, "")
    .replace(/^\s*\[PAUSAD\]\s*/i, "")
    .trim()
}

/**
 * Extract owner names from title brackets, e.g. `[Margaux]` or `[Margaux/Saga]`.
 */
export function ownersFromTitle(title: string): string[] {
  const m = /^\s*\[([^\]]+)\]/.exec(title)
  if (!m) return []
  const inner = m[1]!.trim()
  if (/^PAUSAD$/i.test(inner)) return []
  return inner
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean)
}

export function taskOwnerNames(task: DriftTaskLike): string[] {
  const fromField = task.owner_agent?.trim()
  if (fromField) {
    return fromField
      .split("/")
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return ownersFromTitle(task.title)
}

export function taskMatchesOwnerFilter(
  task: DriftTaskLike,
  ownerFilter: string | null | undefined,
): boolean {
  if (!ownerFilter) return true
  if (ownerFilter === "__none__") {
    return taskOwnerNames(task).length === 0 && !task.assigned_to
  }
  const names = taskOwnerNames(task).map((n) => n.toLowerCase())
  return names.includes(ownerFilter.toLowerCase())
}

export function classifyDriftColumn(
  task: DriftTaskLike,
  now: Date = new Date(),
): DriftColumn | null {
  if (task.deleted_at) return null
  const status = task.status
  const paused = isPausedTitle(task.title) || status === "paused"

  if (status === "cancelled") return "cancelled"
  if (status === "done") return "klart"

  if (paused) return "backlog"

  if (status === "in_progress") return "pagar"

  if (status === "todo") {
    const cutoff = stockholmDaysAgoYmd(14, now)
    const updatedYmd = task.updated_at
      ? stockholmYmd(new Date(task.updated_at))
      : null
    const recent = !!updatedYmd && updatedYmd >= cutoff
    if (task.due_date || recent) return "pagang"
    return "backlog"
  }

  // blocked / review etc. — treat as active work in Pågår for overview
  if (status === "blocked" || status === "review") return "pagar"
  return null
}

export function isDoneThisWeek(
  task: DriftTaskLike,
  now: Date = new Date(),
): boolean {
  if (task.status !== "done") return false
  const { weekStart, weekEnd } = stockholmIsoWeekBounds(now)
  const stamp = task.completed_at ?? task.updated_at
  if (!stamp) return false
  const ymd = stockholmYmd(new Date(stamp))
  return ymd >= weekStart && ymd <= weekEnd
}

/** Done within last 30 days but not this ISO week. */
export function isDoneOlderWithin30Days(
  task: DriftTaskLike,
  now: Date = new Date(),
): boolean {
  if (task.status !== "done") return false
  if (isDoneThisWeek(task, now)) return false
  const stamp = task.completed_at ?? task.updated_at
  if (!stamp) return false
  const ymd = stockholmYmd(new Date(stamp))
  const oldest = stockholmDaysAgoYmd(30, now)
  const { weekStart } = stockholmIsoWeekBounds(now)
  return ymd >= oldest && ymd < weekStart
}

export function doneSortKey(task: DriftTaskLike): string {
  return task.completed_at ?? task.updated_at ?? ""
}
