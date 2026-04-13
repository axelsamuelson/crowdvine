import type { AdminUserMin } from "@/lib/types/operations"

/** Visningsnamn för admin-profil: full_name om satt, annars e-post. */
export function adminDisplayName(u: Pick<AdminUserMin, "email" | "full_name">): string {
  const n = u.full_name?.trim()
  if (n) return n
  return u.email
}
