/**
 * Recalculate base_price_cents from cost_amount for wines created via catalog/MCP
 * before cost-based pricing was wired up.
 *
 * Usage:
 *   pnpm tsx scripts/recalculate-wine-prices.ts [producer_id]
 */
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { applyCostBasedRetailPricing } from "@/lib/wine-retail-pricing";

const DEFAULT_PRODUCER_ID = "99508657-2c57-4980-ad47-652a1da040ca";

async function main() {
  const producerId = process.argv[2]?.trim() || DEFAULT_PRODUCER_ID;
  const sb = getSupabaseAdmin();

  let query = sb
    .from("wines")
    .select(
      "id, wine_name, cost_amount, cost_currency, margin_percentage, price_includes_vat, alcohol_tax_cents, exchange_rate, base_price_cents",
    )
    .gt("cost_amount", 0);

  if (producerId !== "all") {
    query = query.eq("producer_id", producerId);
  }

  const { data: wines, error } = await query.order("wine_name");
  if (error) throw error;

  console.log(`Found ${wines?.length ?? 0} wines with cost > 0`);

  for (const wine of wines ?? []) {
    const patch = await applyCostBasedRetailPricing(
      {},
      wine as Record<string, unknown>,
      { costWasUpdated: true },
    );

    const newCents = patch.base_price_cents as number | undefined;
    const oldCents = wine.base_price_cents as number;

    if (newCents == null || newCents === oldCents) {
      console.log(`  skip ${wine.wine_name}: already ${oldCents / 100} SEK`);
      continue;
    }

    const { error: updateErr } = await sb
      .from("wines")
      .update({
        base_price_cents: newCents,
        calculated_price_cents: newCents,
        exchange_rate: patch.exchange_rate,
        margin_percentage: patch.margin_percentage,
        alcohol_tax_cents: patch.alcohol_tax_cents,
        updated_at: new Date().toISOString(),
      })
      .eq("id", wine.id);

    if (updateErr) {
      console.error(`  FAIL ${wine.wine_name}:`, updateErr.message);
    } else {
      console.log(
        `  ${wine.wine_name}: ${oldCents / 100} → ${newCents / 100} SEK (cost ${wine.cost_amount} ${wine.cost_currency})`,
      );
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
