/**
 * Local crawl worker – Playwright on this machine (residential IP), no Browserless.
 *
 * Usage:
 *   pnpm crawl:local              # batch 3 Stockholm sources (same as admin cron)
 *   pnpm crawl:local 6            # batch of 6
 *   pnpm crawl:local agnes        # single slug smoke test
 *   pnpm crawl:local --slug agnes # explicit single slug
 *
 * Requires: pnpm playwright:install, .env.local with Supabase keys.
 * Unsets BROWSERLESS_API_KEY for this process so browser-adapter uses Playwright.
 */

import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });
dotenv.config({ path: resolve(process.cwd(), ".env.development") });

// Force local Playwright – ignore Browserless even if set in .env.local
delete process.env.BROWSERLESS_API_KEY;
delete process.env.BROWSERLESS_BQL_URL;
delete process.env.BROWSERLESS_BASE_URL;

// Reuse cookies after passing Cloudflare once in a visible browser window
if (!process.env.LOCAL_PLAYWRIGHT_PROFILE) {
  process.env.LOCAL_PLAYWRIGHT_PROFILE = resolve(process.cwd(), ".starwinelist-browser-profile");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const slugFlagIdx = args.indexOf("--slug");
  const singleSlug =
    slugFlagIdx >= 0 ? args[slugFlagIdx + 1]?.trim() : undefined;
  const numericBatch = args.find((a) => /^\d+$/.test(a));
  const bareSlug = args.find(
    (a) => a !== "--slug" && !/^\d+$/.test(a) && !args[args.indexOf(a) - 1]?.startsWith("--"),
  );

  const slug = singleSlug || bareSlug;
  const batchSize = numericBatch ? Number(numericBatch) : 3;

  const { getBrowserAdapterKind } = await import("@/lib/menu-extraction/browser-adapter");
  console.warn("[crawl-local] Adapter:", getBrowserAdapterKind(), "(Browserless disabled)");
  console.warn("[crawl-local] Supabase:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "ok" : "MISSING");

  if (slug) {
    const { crawlSingleRestaurant } = await import("@/lib/menu-extraction/crawler");
    console.warn("[crawl-local] Single slug:", slug);
    const result = await crawlSingleRestaurant(slug);
    console.log(JSON.stringify(result, null, 2));
    const ok =
      Boolean(result.document_id) ||
      (result.skipped && result.skip_reason !== "wrong_city" && !result.error);
    process.exit(ok ? 0 : 1);
    return;
  }

  const { runBatchedCrawlSession } = await import("@/lib/menu-extraction/crawler");
  console.warn("[crawl-local] Batched crawl, size:", batchSize, "city=stockholm");
  const summary = await runBatchedCrawlSession("stockholm", false, batchSize);
  console.log(JSON.stringify(summary, null, 2));
  const failed = (summary.failed ?? 0) + (summary.partial ?? 0);
  process.exit(failed > 0 && (summary.new_pdfs ?? 0) === 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("[crawl-local] Error:", err);
  process.exit(1);
});
