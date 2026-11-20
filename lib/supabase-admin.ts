import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Admin client that bypasses RLS. Never persist or refresh a user session on
 * this instance — calling auth.verifyOtp / setSession here would replace the
 * service-role Authorization header with the user's JWT and break privileged
 * writes (see checkout ensure-session).
 */
export function getSupabaseAdmin(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase admin credentials");
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Ephemeral client for exchanging a server-side token_hash via verifyOtp.
 * Must not be reused for privileged DB work after the session is set.
 */
export function createEphemeralAuthClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("Missing Supabase auth credentials");
  }

  return createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
