import type { MenuDocument } from "./types";

/** True when this exact PDF bytes were already successfully extracted for the slug. */
export function isPdfAlreadyExtracted(
  doc: Pick<MenuDocument, "content_hash" | "extraction_status"> | null,
  contentHash: string,
): boolean {
  if (!doc?.content_hash) return false;
  if (doc.content_hash !== contentHash) return false;
  return doc.extraction_status === "completed";
}

/** Same hash stored but Claude has not completed extraction yet — reuse doc, do not re-upload. */
export function isSamePdfAwaitingExtraction(
  doc: Pick<MenuDocument, "content_hash" | "extraction_status"> | null,
  contentHash: string,
): boolean {
  if (!doc?.content_hash) return false;
  if (doc.content_hash !== contentHash) return false;
  return doc.extraction_status !== "completed";
}

/** Skip extraction when another document for the same slug already extracted this hash. */
export function shouldSkipExtractionAsDuplicate(
  doc: Pick<MenuDocument, "id" | "content_hash" | "source_slug">,
  completedForHash: Pick<MenuDocument, "id"> | null,
): boolean {
  if (!doc.content_hash || !doc.source_slug) return false;
  if (!completedForHash) return false;
  return completedForHash.id !== doc.id;
}
