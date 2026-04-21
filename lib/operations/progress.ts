import type { Task, KeyResult, Objective } from "@/lib/types/operations"

const TASK_WEIGHTS: Record<string, number | null> = {
  todo: 0,
  in_progress: 0.3,
  review: 0.7,
  paused: 0,
  done: 1,
  cancelled: null,
  blocked: 0.1,
}

export function computeTaskWeight(status: string): number | null {
  return TASK_WEIGHTS[status] ?? null
}

export function computeProjectProgress(tasks: Task[]): number {
  const active = tasks.filter((t) => t.status !== "cancelled")
  if (active.length === 0) return 0
  const total = active.reduce((sum, t) => {
    const weight = computeTaskWeight(t.status) ?? 0
    return sum + weight
  }, 0)
  return Math.round((total / active.length) * 100)
}

export function computeKeyResultProgress(kr: KeyResult): number {
  if (kr.type === "binary") {
    return kr.current_value >= kr.target_value ? 100 : 0
  }
  if (kr.target_value === 0) return 0
  return Math.min(
    100,
    Math.round((kr.current_value / kr.target_value) * 100)
  )
}

/** Tasks linked to the objective (`objective_id` set). Only `status` is required for progress. */
export type ObjectiveLinkedTask = Pick<Task, "status"> & { project_id?: string | null }

export function computeObjectiveProgress(
  objective: Pick<
    Objective,
    "progress_method" | "manual_progress" | "insights_target"
  >,
  keyResults: KeyResult[],
  objectiveTasks: ObjectiveLinkedTask[] = [],
  insightCount = 0,
): number {
  if (objective.progress_method === "manual") {
    return objective.manual_progress ?? 0
  }
  if (objective.progress_method === "tasks") {
    return computeProjectProgress(objectiveTasks as Task[])
  }
  if (objective.progress_method === "key_results") {
    if (keyResults.length === 0) return 0
    const total = keyResults.reduce(
      (sum, kr) => sum + computeKeyResultProgress(kr),
      0
    )
    return Math.round(total / keyResults.length)
  }
  if (objective.progress_method === "insights") {
    const target = objective.insights_target ?? 0
    if (target <= 0) return 0
    const n = Math.max(0, insightCount)
    return Math.min(100, Math.round((n / target) * 100))
  }
  if (keyResults.length === 0) return 0
  const total = keyResults.reduce(
    (sum, kr) => sum + computeKeyResultProgress(kr),
    0
  )
  return Math.round(total / keyResults.length)
}

/** Average KR progress, or null if there are no key results. */
export function computeKeyResultsAggregateProgress(
  keyResults: KeyResult[]
): number | null {
  if (keyResults.length === 0) return null
  const total = keyResults.reduce(
    (sum, kr) => sum + computeKeyResultProgress(kr),
    0
  )
  return Math.round(total / keyResults.length)
}

/**
 * Average of per-project task-based progress for the given projects.
 * Projects with no active (non-cancelled) tasks are skipped.
 */
/** Genomsnittlig objective-progress för ett goal (objectives ska redan ha `progress` satt). */
export function computeGoalProgress(
  objectives: Pick<Objective, "progress">[]
): number {
  if (objectives.length === 0) return 0
  const sum = objectives.reduce((s, o) => s + (o.progress ?? 0), 0)
  return Math.round(sum / objectives.length)
}

export function computeProjectsDeliveryAggregateProgress(
  projectIds: string[],
  tasksWithProjectId: Pick<Task, "project_id" | "status">[]
): number | null {
  if (projectIds.length === 0) return null
  const progresses: number[] = []
  for (const pid of projectIds) {
    const projectTasks = tasksWithProjectId.filter(
      (t) => t.project_id === pid
    ) as Task[]
    const active = projectTasks.filter((t) => t.status !== "cancelled")
    if (active.length === 0) continue
    progresses.push(computeProjectProgress(projectTasks))
  }
  if (progresses.length === 0) return null
  return Math.round(
    progresses.reduce((sum, p) => sum + p, 0) / progresses.length
  )
}
