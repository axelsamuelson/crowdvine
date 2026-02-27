/**
 * Run external-price diagnostic for one wine + one source (by slug or first source).
 * Usage: pnpm exec tsx scripts/diagnose-price-source.ts <wineId> [sourceSlug]
 * Example: pnpm exec tsx scripts/diagnose-price-source.ts 509e0e4f-bb1c-475a-86a6-2632065f82cd morenaturalwine
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { runDiagnostic } from "@/lib/external-prices/diagnose";

async function main() {
  const wineId = process.argv[2];
  const sourceSlug = process.argv[3];

  if (!wineId) {
    console.error("Usage: pnpm exec tsx scripts/diagnose-price-source.ts <wineId> [sourceSlug]");
    process.exit(1);
  }

  const sb = getSupabaseAdmin();
  let sourceId: string;

  if (sourceSlug) {
    const { data, error } = await sb
      .from("price_sources")
      .select("id")
      .eq("slug", sourceSlug)
      .maybeSingle();
    if (error || !data) {
      console.error("Source not found for slug:", sourceSlug);
      process.exit(1);
    }
    sourceId = data.id;
  } else {
    const { data, error } = await sb.from("price_sources").select("id").limit(1).maybeSingle();
    if (error || !data) {
      console.error("No price sources found. Create one in Admin first.");
      process.exit(1);
    }
    sourceId = data.id;
  }

  console.error("Running diagnostic: wineId=%s sourceId=%s", wineId, sourceId);
  const result = await runDiagnostic(wineId, sourceId);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
