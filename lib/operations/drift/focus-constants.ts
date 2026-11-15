import type { DriftCompany } from "./priority-rules"

/** PACT: goals 1–2 together must reach at least this share of period points. */
export const PACT_TOP_GOALS_MIN_SHARE = 60

/** PACT sort_order ranks that form the "top" signal group. */
export const PACT_TOP_GOAL_RANKS = [1, 2] as const

/** Confirmer display name for proposed points. */
export function focusPointsConfirmer(company: DriftCompany): string {
  return company === "dirtywine" ? "Léa" : "Pierre"
}

export type FocusGoalColorKey = 1 | 2 | 3 | 4 | 5 | 6

/**
 * Goal bar colors. Goal 6 uses muted rose/plum (not saturated fuchsia) so it
 * stays distinct from goal 3 indigo at similar saturation. Teknik (5) uses
 * slate-400 in dark mode so short bars read as fill, not track/gap.
 */
export const FOCUS_GOAL_BAR_CLASS: Record<FocusGoalColorKey, string> = {
  1: "bg-sky-600 dark:bg-sky-400",
  2: "bg-teal-800 dark:bg-teal-300",
  3: "bg-indigo-400 dark:bg-indigo-300",
  4: "bg-stone-500 dark:bg-stone-400",
  5: "bg-blue-900 dark:bg-slate-400",
  6: "bg-rose-400 dark:bg-rose-300",
}

export function focusGoalColorClass(rank: number): string {
  const key = Math.min(6, Math.max(1, rank)) as FocusGoalColorKey
  return FOCUS_GOAL_BAR_CLASS[key]
}

/** Allowed task_points values. */
export const TASK_POINT_VALUES = [1, 2, 4, 8] as const
export type TaskPointValue = (typeof TASK_POINT_VALUES)[number]

export function isTaskPointValue(n: unknown): n is TaskPointValue {
  return n === 1 || n === 2 || n === 4 || n === 8
}
