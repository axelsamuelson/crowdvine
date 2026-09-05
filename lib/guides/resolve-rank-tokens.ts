import { TOP_100_PRODUCERS } from "@/lib/guides/top-100-producers";

/**
 * Replace `{{rank}}` in a producer note with `#N` from TOP_100_PRODUCERS.
 * Exact name match only — wrong rank is worse than omitting the sentence.
 */
export function resolveRankTokens(
  note: string | null,
  producerName: string | null,
): string | null {
  if (note == null) return null;
  if (!note.includes("{{rank}}")) return note;

  if (producerName == null || producerName === "") return null;

  const match = TOP_100_PRODUCERS.find((p) => p.name === producerName);
  if (!match) return null;

  return note.replaceAll("{{rank}}", `#${match.rank}`);
}
