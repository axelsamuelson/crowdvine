import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isAuthNetworkError,
  isStaleRefreshTokenError,
} from "@/lib/auth/session-errors";

let client: SupabaseClient | null = null;

function wrapAuthMethods(supabase: SupabaseClient) {
  const originalGetUser = supabase.auth.getUser.bind(supabase.auth);
  supabase.auth.getUser = async (jwt?) => {
    try {
      const result = await originalGetUser(jwt);
      if (result.error && isStaleRefreshTokenError(result.error)) {
        await supabase.auth.signOut({ scope: "local" });
        return { data: { user: null }, error: null };
      }
      return result;
    } catch (error) {
      if (isAuthNetworkError(error)) {
        return { data: { user: null }, error: null };
      }
      throw error;
    }
  };

  const originalGetSession = supabase.auth.getSession.bind(supabase.auth);
  supabase.auth.getSession = async () => {
    try {
      const result = await originalGetSession();
      if (result.error && isStaleRefreshTokenError(result.error)) {
        await supabase.auth.signOut({ scope: "local" });
        return { data: { session: null }, error: null };
      }
      return result;
    } catch (error) {
      if (isAuthNetworkError(error)) {
        return { data: { session: null }, error: null };
      }
      throw error;
    }
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
    wrapAuthMethods(client);
  }
  return client;
}
