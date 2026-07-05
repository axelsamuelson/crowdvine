/** Grapes with curated editorial category pages — link only these. */
export const CURATED_GRAPE_SLUGS: Record<string, true> = {
  carignan: true,
  grenache: true,
  "grenache blanc": true,
  syrah: true,
  cinsault: true,
};

export function isCuratedGrape(grape: string): boolean {
  return grape.toLowerCase().trim() in CURATED_GRAPE_SLUGS;
}

export function parseGrapeVarieties(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,;]/)
    .map((g) => g.trim())
    .filter(Boolean);
}

/** Deduplicate case-insensitively; preserve first-seen display casing. */
export function uniqueGrapesPreserveCasing(grapes: string[]): string[] {
  const seen = new Map<string, string>();
  for (const grape of grapes) {
    const trimmed = grape.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) seen.set(key, trimmed);
  }
  return Array.from(seen.values());
}
