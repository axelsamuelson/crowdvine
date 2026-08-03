"use server"

import { revalidatePath } from "next/cache"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentAdmin } from "@/lib/admin-auth-server"
import { refreshAllMetrics } from "@/lib/actions/metrics"

export type MetricsExcludedProfileRow = {
  profile_id: string
  note: string
  reason: string | null
  source_discount_code_id: string | null
  source_discount_code: string | null
  created_at: string
  email: string | null
}

function escapeIlike(q: string): string {
  return q.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")
}

function revalidateExclusionPaths() {
  revalidatePath("/admin/operations/objectives")
  revalidatePath("/admin/operations/objectives/settings")
  revalidatePath("/admin/operations/goals")
  revalidatePath("/admin/strategy-map")
  revalidatePath("/admin/exkluderade-profiler")
}

export async function listMetricExcludedProfiles(): Promise<
  MetricsExcludedProfileRow[]
> {
  const sb = getSupabaseAdmin()
  const { data, error } = await sb
    .from("admin_metrics_excluded_profiles")
    .select(
      "profile_id, note, reason, source_discount_code_id, created_at",
    )
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
    (profs ?? []).map((p) => [p.id as string, (p.email as string) ?? null]),
  )

  const codeIds = [
    ...new Set(
      rows
        .map((r) => r.source_discount_code_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ]
  const codeById = new Map<string, string>()
  if (codeIds.length > 0) {
    const { data: codes } = await sb
      .from("promo_discount_codes")
      .select("id, code")
      .in("id", codeIds)
    for (const c of codes ?? []) {
      if (c.id && c.code) codeById.set(c.id, String(c.code))
    }
  }

  return rows.map((row) => ({
    profile_id: row.profile_id as string,
    note: (row.note as string) ?? "",
    reason: (row.reason as string | null) ?? null,
    source_discount_code_id:
      (row.source_discount_code_id as string | null) ?? null,
    source_discount_code: row.source_discount_code_id
      ? codeById.get(row.source_discount_code_id as string) ?? null
      : null,
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
  note?: string,
  reason: string = "manuell"
): Promise<void> {
  const admin = await getCurrentAdmin()
  if (!admin) throw new Error("Unauthorized")

  const sb = getSupabaseAdmin()
  const { error } = await sb.from("admin_metrics_excluded_profiles").upsert(
    {
      profile_id: profileId,
      note: note?.trim() ?? "",
      reason: reason.trim() || "manuell",
      created_by: admin.id,
      source_discount_code_id: null,
    },
    { onConflict: "profile_id" }
  )

  if (error) throw new Error(error.message)

  await refreshAllMetrics()
  revalidateExclusionPaths()
}

export async function addMetricExcludedProfileByEmail(
  email: string,
  note?: string
): Promise<void> {
  const admin = await getCurrentAdmin()
  if (!admin) throw new Error("Unauthorized")

  const trimmed = email.trim()
  if (!trimmed) throw new Error("E-post krävs")

  const sb = getSupabaseAdmin()
  const { data: profile, error: lookupErr } = await sb
    .from("profiles")
    .select("id")
    .ilike("email", trimmed)
    .maybeSingle()

  if (lookupErr) throw new Error(lookupErr.message)
  if (!profile?.id) throw new Error("Ingen användare med den e-postadressen hittades.")

  await addMetricExcludedProfile(profile.id, note, "manuell")
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
  revalidateExclusionPaths()
}
