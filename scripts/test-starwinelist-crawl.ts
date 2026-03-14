/**
 * Test Starwinelist crawl for Stockholm. Run: pnpm exec tsx scripts/test-starwinelist-crawl.ts
 * Loads .env.local then .env.development for Supabase credentials.
 */
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });
dotenv.config({ path: resolve(process.cwd(), ".env.development") });

async function main() {
  console.log("Testing Starwinelist crawl for Stockholm...\n");

  const { runCrawlSession } = await import("@/lib/menu-extraction/crawler");
  const { fetchRestaurantSlugsByCity, fetchRestaurantPage } = await import(
    "@/lib/menu-extraction/starwinelist-scraper"
  );

  // 1) Test slug fetch
  console.log("1) Fetching restaurant slugs from Starwinelist...");
  const slugs = await fetchRestaurantSlugsByCity("stockholm");
  console.log("   Slugs found:", slugs.length);
  if (slugs.length > 0) {
    console.log("   First 5:", slugs.slice(0, 5).join(", "));
  } else {
    console.log("   No slugs – check 403/timeout or page structure.");
    process.exit(1);
  }

  // 2) Test one restaurant page
  const testSlug = slugs[0];
  console.log("\n2) Fetching one restaurant page:", testSlug);
  const page = await fetchRestaurantPage(testSlug);
  if (page) {
    console.log("   Name:", page.name ?? "—");
    console.log("   PDF URL:", page.pdf_url ?? "—");
    console.log("   Updated:", page.swl_updated_at ?? "—");
  } else {
    console.log("   Failed to fetch page (403/timeout).");
  }

  // 3) Run full crawl session
  console.log("\n3) Running full crawl session (stockholm)...");
  try {
    const summary = await runCrawlSession("stockholm");
    console.log("\nCrawl summary:", JSON.stringify(summary, null, 2));
    if (summary.failed === summary.total_found && summary.total_found > 0) {
      console.log("\n⚠️  All requests got 403 – Starwinelist likely blocks this IP (e.g. datacenter). Try running from a residential network or add Playwright for headless browser.");
    }
  } catch (err) {
    console.error("Crawl failed:", err);
    process.exit(1);
  }
  console.log("\nDone.");
}

main();
