/**
 * Platform staff admin: profiles.role or profiles.roles — not membership tier.
 */
export function isPlatformAdminProfile(
  p: { role?: string | null; roles?: unknown } | null | undefined,
): boolean {
  if (!p) return false;
  if (p.role === "admin") return true;
  return Array.isArray(p.roles) && (p.roles as string[]).includes("admin");
}
