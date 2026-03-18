import type { Task, KeyResult, Objective } from "@/lib/types/operations"

const TASK_WEIGHTS: Record<string, number | null> = {
  todo: 0,
  in_progress: 0.3,
  review: 0.7,
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

export function computeObjectiveProgress(
  objective: Objective,
  keyResults: KeyResult[]
): number {
  if (
    objective.progress_method === "manual" &&
    objective.manual_progress !== null
  ) {
    return objective.manual_progress
  }
  if (keyResults.length === 0) return 0
  const total = keyResults.reduce(
    (sum, kr) => sum + computeKeyResultProgress(kr),
    0
  )
  return Math.round(total / keyResults.length)
}
