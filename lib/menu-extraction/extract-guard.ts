import {
  getCompletedMenuDocumentByContentHash,
  getMenuDocumentById,
  updateMenuDocument,
} from "./db";
import { shouldSkipExtractionAsDuplicate } from "./pdf-idempotency";

/**
 * If the same PDF (content_hash) was already extracted for this slug, mark skipped
 * and return true so callers do not invoke Claude again.
 */
export async function skipExtractionIfDuplicateDocument(
  documentId: string,
): Promise<boolean> {
  const doc = await getMenuDocumentById(documentId);
  if (!doc?.content_hash || !doc.source_slug) return false;

  const completed = await getCompletedMenuDocumentByContentHash(
    doc.source_slug,
    doc.content_hash,
  );
  if (!shouldSkipExtractionAsDuplicate(doc, completed)) return false;

  await updateMenuDocument(documentId, {
    extraction_status: "skipped",
    error_message: `Identisk PDF redan extraherad (dokument ${completed!.id})`,
    last_extraction_attempt_at: new Date().toISOString(),
  });
  return true;
}
