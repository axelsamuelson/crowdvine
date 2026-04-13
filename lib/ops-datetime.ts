/** Formatering för operations-vyer (tasks, projekt, listor). */

export function formatOpsDateTimeSv(iso: string | null | undefined): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("sv-SE")
}

/** ISO datum (YYYY-MM-DD) eller tidsstämpel — datum i sv-SE, UTC-säkert för rena datum. */
export function formatOpsDateOnlySv(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso.trim())
    ? new Date(`${iso.trim()}T12:00:00Z`)
    : new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("sv-SE", { timeZone: "UTC" })
}
