import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/** Shared singleton browser client (avoids duplicate auth refresh races). */
export function createClient() {
  return getSupabaseBrowserClient();
}
