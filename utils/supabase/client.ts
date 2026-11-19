import {
  getSupabaseBrowserClient,
  tryGetSupabaseBrowserClient,
} from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Shared singleton browser client (avoids duplicate auth refresh races). */
export function createClient() {
  return getSupabaseBrowserClient();
}

/** Soft variant for chrome that must render without env (e.g. legacy pages). */
export function tryCreateClient(): SupabaseClient | null {
  return tryGetSupabaseBrowserClient();
}
