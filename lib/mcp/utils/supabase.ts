import { getSupabaseAdmin } from "@/lib/supabase-admin";

/** Supabase admin client for MCP tools (service role, bypasses RLS). */
export function getMcpSupabase() {
  return getSupabaseAdmin();
}
