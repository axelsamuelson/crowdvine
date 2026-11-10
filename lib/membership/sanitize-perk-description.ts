/**
 * Customer-facing perk copy must never call the founding discount "permanent"
 * (Axel / Juliette 2026-11-10). DB rows may still say that historically —
 * strip at serve time; no migration / no prod data rewrite.
 */
export function sanitizeCustomerPerkDescription(
  description: string | null | undefined,
): string {
  if (description == null) return "";
  let d = String(description);
  // EN: "Founding Member permanent discount" → "Founding Member discount"
  d = d.replace(/\bpermanent\b/gi, "");
  // SV variants if ever stored in DB
  d = d.replace(/\bständig(?:a|t)?\b/gi, "");
  return d.replace(/\s{2,}/g, " ").trim();
}

export function sanitizeCustomerPerks<
  T extends { description?: string | null },
>(perks: T[]): T[] {
  return perks.map((p) => ({
    ...p,
    description: sanitizeCustomerPerkDescription(p.description),
  }));
}
