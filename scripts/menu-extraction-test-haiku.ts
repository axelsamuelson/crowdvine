/**
 * Test menu extraction with Claude Haiku 4.5 (cost ~1/3 of Sonnet).
 * Run on 3–4 documents and compare total rows / needs_review to confirm quality.
 *
 * Usage:
 *   HAIKU_TEST_DOCUMENT_IDS=id1,id2,id3 pnpm exec tsx scripts/menu-extraction-test-haiku.ts
 *   # Or without env: uses last 4 menu documents from DB
 *
 * Before running: ensure migration 097 is applied if you want usage columns.
 */

import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });
dotenv.config({ path: resolve(process.cwd(), ".env.development") });

process.env.MENU_EXTRACTION_MODEL = "claude-haiku-4-5";

async function main(): Promise<void> {
  const { getMenuExtractionBatchById, ...db } = await import("@/lib/menu-extraction/db");
  const { extractMenuFromDocument } = await import("@/lib/menu-extraction/service");

  let documentIds: string[] = [];
  const envIds = process.env.HAIKU_TEST_DOCUMENT_IDS?.trim();
  if (envIds) {
    documentIds = envIds.split(",").map((id) => id.trim()).filter(Boolean);
  }
  if (documentIds.length === 0) {
    const docs = await db.listMenuDocuments();
    documentIds = docs.slice(0, 4).map((d) => d.id);
    console.log("No HAIKU_TEST_DOCUMENT_IDS; using last 4 documents:", documentIds.join(", "), "\n");
  } else {
    console.log("HAIKU_TEST_DOCUMENT_IDS:", documentIds.join(", "), "\n");
  }

  if (documentIds.length === 0) {
    console.log("No documents to run. Upload menus or set HAIKU_TEST_DOCUMENT_IDS.");
    process.exit(1);
  }

  console.log("Model:", process.env.MENU_EXTRACTION_MODEL || "claude-sonnet-4-6");
  console.log("Running extraction for", documentIds.length, "document(s)...\n");

  const summaries: { id: string; file_name?: string; total_rows: number; needs_review: number; empty_sections: number; error?: string }[] = [];

  for (const id of documentIds) {
    const doc = await db.getMenuDocumentById(id);
    try {
      await extractMenuFromDocument(id);
      const rows = await db.getExtractedRowsByDocumentId(id);
      const needsReview = rows.filter((r) => r.needs_review).length;
      const sections = await db.getDocumentSectionsByDocumentId(id);
      const emptySections = sections.filter((s) => {
        const sectionRows = rows.filter((r) => r.section_id === s.id);
        return sectionRows.length === 0;
      }).length;
      summaries.push({
        id,
        file_name: doc?.file_name,
        total_rows: rows.length,
        needs_review: needsReview,
        empty_sections: emptySections,
      });
      console.log("  OK", id, "| rows:", rows.length, "| needs_review:", needsReview, "| empty_sections:", emptySections);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      summaries.push({ id, file_name: doc?.file_name, total_rows: 0, needs_review: 0, empty_sections: 0, error: msg });
      console.log("  FAIL", id, "|", msg);
    }
  }

  const totalRows = summaries.reduce((s, x) => s + x.total_rows, 0);
  const totalNeedsReview = summaries.reduce((s, x) => s + x.needs_review, 0);
  const totalEmpty = summaries.reduce((s, x) => s + x.empty_sections, 0);
  const failed = summaries.filter((x) => x.error).length;

  console.log("\n--- Summary (Haiku) ---");
  console.log("Documents:", documentIds.length, "| Total rows:", totalRows, "| Needs review:", totalNeedsReview, "| Empty sections:", totalEmpty, "| Failed:", failed);
  if (totalRows > 0) {
    console.log("Needs-review %:", ((100 * totalNeedsReview) / totalRows).toFixed(1) + "%");
  }
  console.log("\nCompare with same documents run with default model (Sonnet). If row counts and quality are acceptable, set MENU_EXTRACTION_MODEL=claude-haiku-4-5 in production for ~80–90% cost reduction.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
