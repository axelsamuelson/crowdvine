/**
 * Test / fake producers that must never appear on admin Källor.
 * Match is case-insensitive on trimmed producer name.
 */

const EXCLUDED_PRODUCER_NAMES = new Set([
  "théo salvat",
  "theo salvat",
  "fake producer for local testing",
]);

export function isExcludedKallorProducerName(
  name: string | null | undefined,
): boolean {
  const n = String(name ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFC");
  if (!n) return false;
  if (EXCLUDED_PRODUCER_NAMES.has(n)) return true;
  // Accent-insensitive fallback for Théo / Theo
  const folded = n.normalize("NFD").replace(/\p{M}/gu, "");
  return folded === "theo salvat";
}
