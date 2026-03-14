/**
 * Test extraction on a single menu (one slug). Run: pnpm exec tsx scripts/test-one-menu.ts
 * Optional: --force to clear existing doc and re-crawl + extract.
 */

import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });
dotenv.config({ path: resolve(process.cwd(), ".env.development") });

const SLUG = "agnes";
const FORCE = process.argv.includes("--force");

async function main() {
  console.log("Testing one menu – slug:", SLUG, FORCE ? "(--force: clear & re-crawl)" : "\n");

  if (FORCE) {
    const db = await import("@/lib/menu-extraction/db");
    await db.deleteMostRecentDocumentForSlug(SLUG);
    const source = await db.getStarwinelistSourceBySlug(SLUG);
    if (source) await db.updateStarwinelistSource(source.id, { crawl_attempts: 0 });
    console.log("Cleared and reset", SLUG, "\n");
  }

  const { runCrawlForSlugs } = await import("@/lib/menu-extraction/crawler");
  const summary = await runCrawlForSlugs([SLUG]);

  console.log("\n--- Summary ---");
  console.log(JSON.stringify(summary, null, 2));
  console.log(
    summary.extracted && summary.extracted > 0
      ? "\n✅ Extraction succeeded for this menu."
      : summary.extraction_failed && summary.extraction_failed > 0
        ? "\n❌ Extraction failed – check [menu-extraction] logs above."
        : "\n⚠️ No new document created (skipped or no PDF). Try with --force."
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
