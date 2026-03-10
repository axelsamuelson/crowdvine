/**
 * Test Vivino adapter in isolation (no DB required).
 * Usage: pnpm exec tsx scripts/test-vivino-adapter.ts [searchQuery]
 * Example: pnpm exec tsx scripts/test-vivino-adapter.ts "Point 2024"
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { vivinoAdapter } from "@/lib/external-prices/adapters/vivino";

const mockSource = {
  id: "test",
  base_url: "https://www.vivino.com",
  rate_limit_delay_ms: 1500,
  search_url_template: null,
  sitemap_url: null,
  name: "Vivino",
  slug: "vivino",
  adapter_type: "vivino",
  is_active: true,
  config: {},
} as any;

const argQuery = process.argv[2]?.trim() || "Point 2024";
const mockWine = {
  id: "test-wine",
  wine_name: argQuery.split(/\s+/).slice(0, -1).join(" ") || argQuery,
  vintage: (argQuery.match(/\b(19|20)\d{2}\b/)?.[0] as string) || "2024",
  producer: { name: "Thomas Chany" },
} as any;

async function main() {
  const query = process.argv[2] || "Point 2024";
  console.log("Testing Vivino adapter");
  console.log("  Search query:", query);
  console.log("  Wine:", mockWine.wine_name, mockWine.vintage, mockWine.producer?.name);
  console.log("");

  // 1) Search candidates
  console.log("1) searchCandidates...");
  const candidates = await vivinoAdapter.searchCandidates(mockWine, mockSource);
  console.log("   Candidates found:", candidates.length);
  candidates.slice(0, 5).forEach((u, i) => console.log(`   [${i + 1}] ${u}`));
  if (candidates.length > 5) console.log("   ...");
  console.log("");

  if (candidates.length === 0) {
    console.log("No candidates. Exiting.");
    return;
  }

  // 2) Fetch first PDP (or use optional second arg as direct PDP URL)
  let pdpUrl = process.argv[3] || candidates[0];
  const isSearchPage = pdpUrl.includes("/search/wines");
  if (isSearchPage && !process.argv[3]) {
    console.log("2) First candidate is search page (Vivino renders wine links via JS). Testing with a known PDP instead.");
    pdpUrl = "https://www.vivino.com/Archery-Summit-Arcus-Estate-Pinot-Noir/w/118";
  }
  console.log("2) fetchOffer for:", pdpUrl);
  const offer = await vivinoAdapter.fetchOffer(pdpUrl, mockSource);
  if (offer) {
    console.log("   Offer:", JSON.stringify(offer, null, 2));
  } else {
    console.log("   No offer parsed (null).");
  }
  console.log("\nDone. To test a specific PDP: pnpm exec tsx scripts/test-vivino-adapter.ts \"Query\" \"https://www.vivino.com/...\"");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
