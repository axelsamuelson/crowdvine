import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Profile UUID used for admin_tasks.created_by / admin_projects.created_by / admin_goals.created_by / admin_objectives.created_by.
 * Set MCP_ACTOR_PROFILE_ID in production; otherwise first admin profile is used.
 */
export async function getMcpActorProfileId(
  sb: SupabaseClient,
): Promise<string> {
  const envId = process.env.MCP_ACTOR_PROFILE_ID?.trim();
  if (envId) return envId;

  const { data: byRole } = await sb
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();

  if (byRole?.id) return byRole.id as string;

  const { data: byRoles } = await sb
    .from("profiles")
    .select("id")
    .contains("roles", ["admin"])
    .limit(1)
    .maybeSingle();

  if (byRoles?.id) return byRoles.id as string;

  const { data: anyProfile } = await sb
    .from("profiles")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (anyProfile?.id) return anyProfile.id as string;

  throw new Error(
    "No profile for MCP actor: set MCP_ACTOR_PROFILE_ID or ensure an admin profile exists.",
  );
}
