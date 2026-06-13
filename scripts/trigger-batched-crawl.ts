/**
 * Manual batched crawl (same logic as GET /api/cron/crawl-menus).
 * Run: pnpm exec tsx scripts/trigger-batched-crawl.ts
 */

import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });
dotenv.config({ path: resolve(process.cwd(), ".env.development") });

async function main(): Promise<void> {
  const batch = Number(process.argv[2] ?? 12);
  const { runBatchedCrawlSession } = await import("@/lib/menu-extraction/crawler");
  console.warn("[trigger-batched-crawl] Starting batch of", batch, "sources...");
  const summary = await runBatchedCrawlSession("stockholm", false, batch);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
