import type { SupabaseClient } from "@supabase/supabase-js";

/** Profile IDs omitted from admin analytics funnel / events / views. */
export async function getExcludedProfileIds(
  sb: SupabaseClient,
): Promise<Set<string>> {
  const { data, error } = await sb
    .from("admin_metrics_excluded_profiles")
    .select("profile_id");
  if (error) {
    console.warn("[analytics] excluded profiles:", error.message);
    return new Set();
  }
  return new Set(
    (data ?? [])
      .map((r) => r.profile_id as string)
      .filter((id) => typeof id === "string" && id.length > 0),
  );
}

export function isExcludedUserId(
  userId: string | null | undefined,
  excluded: Set<string>,
): boolean {
  if (!userId) return false;
  return excluded.has(userId);
}
