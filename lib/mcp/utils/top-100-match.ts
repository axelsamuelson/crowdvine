import { TOP_100_PRODUCERS } from "@/lib/guides/top-100-producers";
import { TOP_100_WINES } from "@/lib/guides/top-100-wines";

export type RankedLabel = { rank: number; label: string };

/**
 * Near-match helper shared by curated write validation and top-100 read tools.
 * Word/substring heuristics only — never used for silent auto-linking.
 */
export function nearRankedMatches(
  input: string,
  entries: ReadonlyArray<RankedLabel>,
  limit = 8,
): string[] {
  const q = input.toLowerCase().trim();
  if (!q) return [];
  const words = q.split(/\s+/).filter((w) => w.length > 2);
  const hits = entries.filter((entry) => {
    const n = entry.label.toLowerCase();
    if (n.includes(q) || q.includes(n)) return true;
    return words.some((w) => n.includes(w));
  });
  return hits
    .slice(0, limit)
    .map((entry) => `#${entry.rank} ${entry.label}`);
}

export function findTop100ProducerExact(name: string) {
  return TOP_100_PRODUCERS.find((p) => p.name === name) ?? null;
}

/**
 * Canonical name, or an exact declared alias (for example a Systembolaget
 * producer_name). Returns the list row, whose `.name` stays the canonical one.
 * Not a fuzzy match: the string must equal `name` or an `aliases` entry.
 */
export function findTop100ProducerByNameOrAlias(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return null;
  return (
    findTop100ProducerExact(trimmed) ??
    TOP_100_PRODUCERS.find((p) => p.aliases?.includes(trimmed)) ??
    null
  );
}

export function nearTop100ProducerMatches(input: string): string[] {
  const labels: RankedLabel[] = [];
  for (const producer of TOP_100_PRODUCERS) {
    labels.push({ rank: producer.rank, label: producer.name });
    for (const alias of producer.aliases ?? []) {
      labels.push({ rank: producer.rank, label: alias });
    }
  }
  const hits = nearRankedMatches(input, labels);
  const seen = new Set<number>();
  const canonical: string[] = [];
  for (const hit of hits) {
    const rank = Number(/^#(\d+)\s/.exec(hit)?.[1]);
    if (!Number.isFinite(rank) || seen.has(rank)) continue;
    seen.add(rank);
    const producer = TOP_100_PRODUCERS.find((row) => row.rank === rank);
    canonical.push(producer ? `#${rank} ${producer.name}` : hit);
  }
  return canonical;
}

export function findTop100WineExact(wine: string) {
  return TOP_100_WINES.find((w) => w.wine === wine) ?? null;
}

export function nearTop100WineMatches(input: string): string[] {
  return nearRankedMatches(
    input,
    TOP_100_WINES.map((w) => ({ rank: w.rank, label: w.wine })),
  );
}

export function ilikeContains(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase().trim());
}

export function exactCi(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}
