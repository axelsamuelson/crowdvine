const PLACEHOLDER_HOST = "placeholder.supabase.co";

/** True when the URL host is the unresolved host GitHub Actions uses at build time. */
export function isPlaceholderSupabaseUrl(
  url: string | null | undefined,
): boolean {
  if (!url) return false;
  try {
    return new URL(url).hostname === PLACEHOLDER_HOST;
  } catch {
    return false;
  }
}

export function supabaseBuildUsesPlaceholder(): boolean {
  return isPlaceholderSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
}
