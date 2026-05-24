import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isStaleRefreshTokenError } from "@/lib/auth/session-errors";

let client: SupabaseClient | null = null;

function wrapAuthGetUser(supabase: SupabaseClient) {
  const original = supabase.auth.getUser.bind(supabase.auth);
  supabase.auth.getUser = async (jwt?) => {
    const result = await original(jwt);
    if (result.error && isStaleRefreshTokenError(result.error)) {
      await supabase.auth.signOut({ scope: "local" });
      return { data: { user: null }, error: null };
    }
    return result;
  };
}

export function getSupabaseBrowserClient(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
    if (!url || !key) {
      throw new Error(
        "Missing Supabase env vars. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. See docs/VERCEL_ENV_SETUP.md",
      );
    }
    client = createBrowserClient(url, key);
    wrapAuthGetUser(client);
  }
  return client;
}
