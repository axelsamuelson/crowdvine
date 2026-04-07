"use server"

import { revalidatePath } from "next/cache"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import type { MetricResult, ObjectiveMetricRow } from "@/lib/types/operations"

function computeProgress(
  current: number,
  target: number | null,
): number {
  if (target == null || target === 0) return 0
  return Math.min(100, Math.round((current / target) * 1000) / 10)
}

function rowToResult(row: ObjectiveMetricRow): MetricResult {
  const target =
    row.target_value == null ? null : Number(row.target_value)
  const current = Number(row.current_value)
  return {
    slug: row.slug,
    label: row.label,
    unit: row.unit,
    current_value: current,
    target_value: target,
    progress: computeProgress(current, target),
    refreshed_at: row.refreshed_at,
  }
}

export async function getMetricsForObjective(
  objectiveId: string,
): Promise<MetricResult[]> {
  const sb = getSupabaseAdmin()
  const { data, error } = await sb
    .from("admin_objective_metrics")
    .select("*")
    .eq("objective_id", objectiveId)
    .order("slug")

  if (error) throw error
  return (data as ObjectiveMetricRow[] | null)?.map(rowToResult) ?? []
}

export async function getMetricsForObjectives(
  objectiveIds: string[],
): Promise<Map<string, MetricResult[]>> {
  const map = new Map<string, MetricResult[]>()
  if (objectiveIds.length === 0) return map

  const sb = getSupabaseAdmin()
  const { data, error } = await sb
    .from("admin_objective_metrics")
    .select("*")
    .in("objective_id", objectiveIds)
    .order("slug")

  if (error) throw error
  for (const id of objectiveIds) map.set(id, [])
  for (const row of (data as ObjectiveMetricRow[] | null) ?? []) {
    const list = map.get(row.objective_id) ?? []
    list.push(rowToResult(row))
    map.set(row.objective_id, list)
  }
  return map
}

export async function refreshObjectiveMetrics(
  objectiveId: string,
): Promise<MetricResult[]> {
  const sb = getSupabaseAdmin()
  const { error } = await sb.rpc("admin_refresh_objective_metrics", {
    p_objective_id: objectiveId,
  })
  if (error) throw error
  revalidatePath("/admin/operations/goals")
  revalidatePath("/admin/operations/objectives")
  revalidatePath("/admin/strategy-map")
  return getMetricsForObjective(objectiveId)
}

/**
 * Kör metrics-RPC för alla objectives under målet. Ingen revalidatePath —
 * säker att anropa under RSC-render (t.ex. goal-detaljsidan före läsning).
 */
export async function refreshGoalMetricsData(goalId: string): Promise<void> {
  const sb = getSupabaseAdmin()
  const { data: objs, error: oErr } = await sb
    .from("admin_objectives")
    .select("id")
    .eq("goal_id", goalId)
    .is("deleted_at", null)

  if (oErr) throw oErr
  for (const row of objs ?? []) {
    const { error } = await sb.rpc("admin_refresh_objective_metrics", {
      p_objective_id: row.id,
    })
    if (error) throw error
  }
}

/** Anropas från klient (knapp) efter mutation — inkluderar revalidatePath. */
export async function refreshGoalMetrics(goalId: string): Promise<void> {
  await refreshGoalMetricsData(goalId)
  revalidatePath(`/admin/operations/goals/${goalId}`)
  revalidatePath("/admin/operations/goals")
  revalidatePath("/admin/operations/objectives")
  revalidatePath("/admin/strategy-map")
}

export async function refreshAllMetrics(): Promise<void> {
  const sb = getSupabaseAdmin()
  const { data, error } = await sb
    .from("admin_objective_metrics")
    .select("objective_id")

  if (error) throw error
  const ids = [
    ...new Set((data ?? []).map((r) => r.objective_id as string)),
  ]
  for (const objectiveId of ids) {
    const { error: rpcErr } = await sb.rpc("admin_refresh_objective_metrics", {
      p_objective_id: objectiveId,
    })
    if (rpcErr) throw rpcErr
  }
  revalidatePath("/admin/operations/goals")
  revalidatePath("/admin/operations/objectives")
  revalidatePath("/admin/strategy-map")
}
