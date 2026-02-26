/**
 * Normalize wine and PDP strings for matching: lowercase, trim, collapse spaces,
 * optional vintage/size extraction from PDP title.
 */

export function normalizeForMatch(s: string): string {
  if (!s || typeof s !== "string") return "";
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/['']/g, "'")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, ""); // strip accents
}

/** Extract vintage (4-digit year) from a string if present. */
export function extractVintage(s: string): string | null {
  const m = s.match(/\b(19|20)\d{2}\b/);
  return m ? m[0] : null;
}

/** Remove vintage (4-digit year) and optional surrounding parens/spaces from a string. Used so "Rocalhas (2020)" and "Rocalhas 2020" compare as the same. */
export function stripVintageFromString(s: string): string {
  if (!s || typeof s !== "string") return "";
  return s
    .replace(/\s*\(?\s*(19|20)\d{2}\s*\)?\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extract size (e.g. 75cl, 750ml) from PDP title for optional stricter matching. */
export function extractSize(s: string): string | null {
  const m = s.match(/\b(\d+(?:\.\d+)?)\s*(?:cl|ml)\b/i);
  return m ? m[0].toLowerCase() : null;
}

/** Normalize producer name (often "Producer Name" or "Producer Name -"). */
export function normalizeProducer(name: string | undefined | null): string {
  return normalizeForMatch(name ?? "");
}

/** Normalize wine name (e.g. "Wine Name" or "Wine Name 2022"). Year is stripped before normalizing so matching ignores vintage in the string. */
export function normalizeWineName(name: string | undefined | null): string {
  return normalizeForMatch(stripVintageFromString(name ?? ""));
}

/** Normalize PDP title: remove store suffix "| Shop Name", strip year so "Rocalhas 2020" matches "Rocalhas (2020)". */
export function normalizePdpTitle(title: string | undefined | null): string {
  let t = title ?? "";
  t = t.replace(/\s*\|[\s\S]*$/, "").trim(); // drop only after pipe (e.g. "| MORE Natural Wine")
  t = stripVintageFromString(t);
  return normalizeForMatch(t);
}
