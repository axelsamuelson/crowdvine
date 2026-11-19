import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function hasSupabaseAdminCredentials(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

/**
 * Soft read path for public/layout routes: return null when the service role
 * is unset instead of throwing (avoids Next.js error overlays on pages that
 * must render without admin, e.g. /reservation-extension/confirm).
 */
export function tryGetSupabaseAdmin(): SupabaseClient | null {
  if (!hasSupabaseAdminCredentials()) return null;
  return getSupabaseAdmin();
}

// Admin-only Supabase client that bypasses RLS and doesn't use cookies
export function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase admin credentials");
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}
