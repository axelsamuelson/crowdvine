"use server"

import { revalidatePath } from "next/cache"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentAdmin } from "@/lib/admin-auth-server"
import { refreshAllMetrics } from "@/lib/actions/metrics"

export type MetricsExcludedProfileRow = {
  profile_id: string
  note: string
  created_at: string
  email: string | null
}

function escapeIlike(q: string): string {
  return q.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")
}

export async function listMetricExcludedProfiles(): Promise<
  MetricsExcludedProfileRow[]
> {
  const sb = getSupabaseAdmin()
  const { data, error } = await sb
    .from("admin_metrics_excluded_profiles")
    .select("profile_id, note, created_at")
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)

  const rows = data ?? []
  if (rows.length === 0) return []

  const ids = rows.map((r) => r.profile_id as string)
  const { data: profs } = await sb
    .from("profiles")
    .select("id, email")
    .in("id", ids)

  const emailById = new Map(
    (profs ?? []).map((p) => [p.id as string, (p.email as string) ?? null])
  )

  return rows.map((row) => ({
    profile_id: row.profile_id as string,
    note: (row.note as string) ?? "",
    created_at: row.created_at as string,
    email: emailById.get(row.profile_id as string) ?? null,
  }))
}

export async function searchProfilesForMetricExclusion(
  query: string,
  limit = 25
): Promise<{ id: string; email: string | null }[]> {
  const admin = await getCurrentAdmin()
  if (!admin) throw new Error("Unauthorized")

  const q = query.trim()
  if (q.length < 2) return []

  const sb = getSupabaseAdmin()
  const pattern = `%${escapeIlike(q)}%`
  const { data, error } = await sb
    .from("profiles")
    .select("id, email")
    .ilike("email", pattern)
    .order("email")
    .limit(limit)

  if (error) throw new Error(error.message)
  return (data ?? []) as { id: string; email: string | null }[]
}

export async function addMetricExcludedProfile(
  profileId: string,
  note?: string
): Promise<void> {
  const admin = await getCurrentAdmin()
  if (!admin) throw new Error("Unauthorized")

  const sb = getSupabaseAdmin()
  const { error } = await sb.from("admin_metrics_excluded_profiles").upsert(
    {
      profile_id: profileId,
      note: note?.trim() ?? "",
      created_by: admin.id,
    },
    { onConflict: "profile_id" }
  )

  if (error) throw new Error(error.message)

  await refreshAllMetrics()
  revalidatePath("/admin/operations/objectives")
  revalidatePath("/admin/operations/objectives/settings")
  revalidatePath("/admin/operations/goals")
  revalidatePath("/admin/strategy-map")
}

export async function removeMetricExcludedProfile(
  profileId: string
): Promise<void> {
  const admin = await getCurrentAdmin()
  if (!admin) throw new Error("Unauthorized")

  const sb = getSupabaseAdmin()
  const { error } = await sb
    .from("admin_metrics_excluded_profiles")
    .delete()
    .eq("profile_id", profileId)

  if (error) throw new Error(error.message)

  await refreshAllMetrics()
  revalidatePath("/admin/operations/objectives")
  revalidatePath("/admin/operations/objectives/settings")
  revalidatePath("/admin/operations/goals")
  revalidatePath("/admin/strategy-map")
}
