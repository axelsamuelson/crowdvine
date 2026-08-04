import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isAuthNetworkError,
  isStaleRefreshTokenError,
} from "@/lib/auth/session-errors";

let client: SupabaseClient | null = null;

/** Drop singleton so the next client can store a fresh PKCE code verifier. */
export function resetSupabaseBrowserClient() {
  client = null;
}

function wrapAuthMethods(supabase: SupabaseClient) {
  const clearLocalSession = async () => {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      /* ignore */
    } finally {
      // @supabase/ssr can fail to write a new code-verifier after signOut on the
      // same singleton — force a fresh client for the next auth start.
      resetSupabaseBrowserClient();
    }
  };

  const originalGetUser = supabase.auth.getUser.bind(supabase.auth);
  supabase.auth.getUser = async (jwt?) => {
    try {
      const result = await originalGetUser(jwt);
      if (result.error && isStaleRefreshTokenError(result.error)) {
        await clearLocalSession();
        return { data: { user: null }, error: null };
      }
      return result;
    } catch (error) {
      if (isStaleRefreshTokenError(error)) {
        await clearLocalSession();
        return { data: { user: null }, error: null };
      }
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
        await clearLocalSession();
        return { data: { session: null }, error: null };
      }
      return result;
    } catch (error) {
      if (isStaleRefreshTokenError(error)) {
        await clearLocalSession();
        return { data: { session: null }, error: null };
      }
      if (isAuthNetworkError(error)) {
        return { data: { session: null }, error: null };
      }
      throw error;
    }
  };

  const originalRefreshSession = supabase.auth.refreshSession.bind(
    supabase.auth,
  );
  supabase.auth.refreshSession = async (currentSession?) => {
    try {
      const result = await originalRefreshSession(currentSession);
      if (result.error && isStaleRefreshTokenError(result.error)) {
        await clearLocalSession();
        return { data: { session: null, user: null }, error: null };
      }
      return result;
    } catch (error) {
      if (isStaleRefreshTokenError(error)) {
        await clearLocalSession();
        return { data: { session: null, user: null }, error: null };
      }
      if (isAuthNetworkError(error)) {
        return { data: { session: null, user: null }, error: null };
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

/** Clear local auth state and recreate client (for starting a new magic-link flow). */
export async function prepareFreshBrowserAuth(): Promise<SupabaseClient> {
  if (client) {
    try {
      await client.auth.signOut({ scope: "local" });
    } catch {
      /* ignore */
    }
  }
  resetSupabaseBrowserClient();
  return getSupabaseBrowserClient();
}
