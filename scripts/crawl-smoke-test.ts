/**
 * Smoke test for Starwinelist crawl: runs crawl for a few slugs and prints summary.
 * Run: pnpm crawl:smoke
 * Run with force (delete existing docs so PDF + extraction run again): pnpm crawl:smoke --force
 * Loads .env.local and .env.development; uses runCrawlForSlugs (same logic as POST /api/admin/menu-extraction/crawl with body.slugs).
 */

import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });
dotenv.config({ path: resolve(process.cwd(), ".env.development") });

const SMOKE_SLUGS = ["spritmuseum", "brasserie-elverket", "agnes"];
const FORCE = process.argv.includes("--force");

interface CrawlSessionSummary {
  total_found: number;
  new_pdfs: number;
  updated_pdfs: number;
  skipped: number;
  failed: number;
  partial?: number;
  rate_limit_429?: boolean;
  document_ids: string[];
  extracted?: number;
  extraction_failed?: number;
}

async function main(): Promise<void> {
  console.log("Crawl smoke test – slugs:", SMOKE_SLUGS.join(", "), FORCE ? "(--force: deleting existing docs)" : "", "\n");

  if (FORCE) {
    const {
      deleteMostRecentDocumentForSlug,
      getStarwinelistSourceBySlug,
      updateStarwinelistSource,
    } = await import("@/lib/menu-extraction/db");
    for (const slug of SMOKE_SLUGS) {
      await deleteMostRecentDocumentForSlug(slug);
      const source = await getStarwinelistSourceBySlug(slug);
      if (source) {
        await updateStarwinelistSource(source.id, { crawl_attempts: 0 });
      }
      console.log("  Cleared latest document and reset crawl_attempts for slug:", slug);
    }
    console.log("");
  }

  const { runCrawlForSlugs } = await import("@/lib/menu-extraction/crawler");
  const summary: CrawlSessionSummary = await runCrawlForSlugs(SMOKE_SLUGS);

  console.log("\n--- CrawlSessionSummary ---");
  console.log("  total_found     :", summary.total_found);
  console.log("  new_pdfs        :", summary.new_pdfs);
  console.log("  updated_pdfs    :", summary.updated_pdfs);
  console.log("  skipped         :", summary.skipped);
  console.log("  partial         :", summary.partial ?? 0);
  console.log("  failed          :", summary.failed);
  console.log("  extracted       :", summary.extracted ?? 0);
  console.log("  extraction_failed:", summary.extraction_failed ?? 0);
  console.log("  document_ids    :", summary.document_ids?.length ?? 0);
  if (summary.rate_limit_429) {
    console.log("\n  ⚠️  rate_limit_429: true");
  }
  if ((summary.partial ?? 0) > 0) {
    console.log("\n  ❌ PARTIAL:", summary.partial, "slug(s) – PDF not downloaded (URL saved for retry)");
  }
  if (summary.failed > 0) {
    console.log("\n  ❌ FAILED:", summary.failed, "slug(s)");
  }
  if ((summary.extraction_failed ?? 0) > 0) {
    console.log("\n  ❌ EXTRACTION_FAILED:", summary.extraction_failed, "document(s)");
  }
  const hasProblems =
    (summary.failed ?? 0) > 0 ||
    (summary.partial ?? 0) > 0 ||
    (summary.extraction_failed ?? 0) > 0;
  console.log(hasProblems ? "\nSmoke test: FAILED (partial, failed, or extraction_failed)" : "\nSmoke test: OK");
  process.exit(hasProblems ? 1 : 0);
}

main().catch((err) => {
  console.error("Smoke test error:", err);
  process.exit(1);
});
