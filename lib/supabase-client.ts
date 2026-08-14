/**
 * Shared browser Supabase client.
 * Prefer `@/lib/supabase/client` (`getSupabaseBrowserClient`) for new code —
 * that path clears stale refresh tokens instead of throwing.
 */
export {
  getSupabaseBrowserClient as getSupabaseClient,
  getSupabaseBrowserClient,
  prepareFreshBrowserAuth,
  resetSupabaseBrowserClient,
} from "@/lib/supabase/client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/** Lazy singleton with stale-refresh handling (same as getSupabaseBrowserClient). */
export const supabase = new Proxy({} as ReturnType<typeof getSupabaseBrowserClient>, {
  get(_target, prop, receiver) {
    const client = getSupabaseBrowserClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
