import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isAuthNetworkError,
  isStaleRefreshTokenError,
  isSupabaseAuthCookieName,
} from "@/lib/auth/session-errors";

let client: SupabaseClient | null = null;

/**
 * Cookie options for PKCE code-verifier storage.
 *
 * - sameSite: 'lax' — REQUIRED. Supabase redirects from *.supabase.co back to
 *   our origin as a top-level GET; 'strict' would omit the verifier cookie.
 * - secure: only on https (never on http://localhost or the cookie is dropped).
 * - path: '/' — callback and checkout must see the same cookie.
 * - no domain — host-only; setting a Domain on localhost breaks storage.
 */
export function getBrowserAuthCookieOptions(): {
  path: string;
  sameSite: "lax";
  secure: boolean;
} {
  const secure =
    typeof window !== "undefined"
      ? window.location.protocol === "https:"
      : process.env.NODE_ENV === "production";
  return {
    path: "/",
    sameSite: "lax",
    secure,
  };
}

/** Drop our singleton so the next auth start can write a fresh PKCE cookie. */
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
      if (typeof document !== "undefined") {
        for (const raw of document.cookie.split(";")) {
          const name = raw.split("=")[0]?.trim();
          if (!name || !isSupabaseAuthCookieName(name)) continue;
          document.cookie = `${name}=; Max-Age=0; path=/`;
        }
      }
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

/**
 * Browser Supabase client via @supabase/ssr createBrowserClient.
 * Uses DEFAULT cookie storage (document.cookie) — no localStorage adapter.
 * flowType defaults to pkce.
 *
 * isSingleton: false + our module `client` — prepareFreshBrowserAuth can
 * null the module ref and create a NEW client that still shares document.cookie
 * storage (same cookie name / path). It does NOT create a second parallel
 * cookie jar; it avoids reusing an in-memory client whose auth state was
 * signed out and may refuse to write a new code-verifier.
 *
 * detectSessionInUrl: false — we exchange ?code= only on /auth/pkce so a
 * concurrent auto-detect cannot double-consume the auth code.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
    if (!url || !key) {
      throw new Error(
        "Missing Supabase env vars. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. See docs/VERCEL_ENV_SETUP.md",
      );
    }
    client = createBrowserClient(url, key, {
      isSingleton: false,
      cookieOptions: getBrowserAuthCookieOptions(),
      // Note: @supabase/ssr 0.7 hardcodes detectSessionInUrl: true after
      // spreading options.auth — we cannot disable it here. /auth/pkce
      // tolerates the race (getSession first, then exchange).
    });
    wrapAuthMethods(client);
  }
  return client;
}

/**
 * Clear local auth session cookies, drop the module singleton, return a fresh
 * client. Used before signInWithOtp so a new PKCE code-verifier is written.
 * Does NOT clear cv_auth_email / cv_auth_next (those are our cookies).
 * signOut runs first (may remove the previous verifier); then a new client
 * writes the next verifier on signInWithOtp — it does not clear after write.
 */
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
