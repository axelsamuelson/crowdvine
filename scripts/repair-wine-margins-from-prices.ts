/**
 * Repair wines where margin_percentage was saved with FX≈1 (EUR treated as SEK).
 * Keeps base_price_cents (shop/PDP price) and reverse-solves a real margin using
 * a proper EUR→SEK rate + alcohol tax, so admin slutpris matches PDP.
 *
 * Usage:
 *   pnpm tsx scripts/repair-wine-margins-from-prices.ts
 *   pnpm tsx scripts/repair-wine-margins-from-prices.ts --dry-run
 */
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  calculateRetailPriceCents,
  DEFAULT_ALCOHOL_TAX_CENTS,
  fetchExchangeRateToSek,
  implyMarginPercentageFromRetailPrice,
  resolveSekExchangeRateSync,
  resolveWineAlcoholTaxCents,
} from "@/lib/wine-retail-pricing";

const dryRun = process.argv.includes("--dry-run");

async function main() {
  const sb = getSupabaseAdmin();
  const { data: wines, error } = await sb
    .from("wines")
    .select(
      "id, wine_name, vintage, cost_amount, cost_currency, margin_percentage, price_includes_vat, alcohol_tax_cents, exchange_rate, base_price_cents",
    )
    .gt("cost_amount", 0)
    .not("margin_percentage", "is", null)
    .order("wine_name");

  if (error) throw error;

  const rateCache = new Map<string, number>();
  let updated = 0;
  let skipped = 0;

  for (const wine of wines ?? []) {
    const currency = String(wine.cost_currency || "EUR").toUpperCase();
    let rate = rateCache.get(currency);
    if (rate == null) {
      rate = await fetchExchangeRateToSek(currency);
      if (currency !== "SEK" && !(rate > 1.5)) {
        rate = resolveSekExchangeRateSync(currency);
      }
      rateCache.set(currency, rate);
    }

    const tax = resolveWineAlcoholTaxCents(
      wine.alcohol_tax_cents ?? DEFAULT_ALCOHOL_TAX_CENTS,
    );
    // Prefer standard 22.19 SEK for repair so admin (default tax) matches PDP
    const repairTax = DEFAULT_ALCOHOL_TAX_CENTS;

    const expectedWithStoredMargin = calculateRetailPriceCents({
      costAmount: Number(wine.cost_amount),
      exchangeRate: rate,
      priceIncludesVat: wine.price_includes_vat !== false,
      marginPercentage: Number(wine.margin_percentage),
      alcoholTaxCents: repairTax,
    });

    const saved = Number(wine.base_price_cents || 0);
    if (
      expectedWithStoredMargin != null &&
      Math.abs(expectedWithStoredMargin - saved) <= 100
    ) {
      skipped++;
      continue;
    }

    const implied = implyMarginPercentageFromRetailPrice({
      retailPriceCents: saved,
      costAmount: Number(wine.cost_amount),
      exchangeRate: rate,
      priceIncludesVat: wine.price_includes_vat !== false,
      alcoholTaxCents: repairTax,
    });

    if (implied == null) {
      console.warn(
        `  skip ${wine.wine_name} ${wine.vintage}: cannot imply margin (price ${saved / 100} SEK, cost ${wine.cost_amount} ${currency})`,
      );
      skipped++;
      continue;
    }

    const verify = calculateRetailPriceCents({
      costAmount: Number(wine.cost_amount),
      exchangeRate: rate,
      priceIncludesVat: wine.price_includes_vat !== false,
      marginPercentage: implied,
      alcoholTaxCents: repairTax,
    });

    console.log(
      `  ${wine.wine_name} ${wine.vintage}: margin ${wine.margin_percentage}% → ${implied}% | price ${saved / 100} SEK (verify ${verify != null ? verify / 100 : "?"}) | FX ${rate}`,
    );

    if (!dryRun) {
      const { error: updateErr } = await sb
        .from("wines")
        .update({
          margin_percentage: implied,
          exchange_rate: rate,
          alcohol_tax_cents: repairTax,
          // Keep shop price; only align inputs that drive admin preview
          updated_at: new Date().toISOString(),
        })
        .eq("id", wine.id);
      if (updateErr) {
        console.error(`  FAIL ${wine.wine_name}:`, updateErr.message);
        continue;
      }
    }
    updated++;
  }

  console.log(
    `\n${dryRun ? "Dry run — would update" : "Updated"} ${updated}, skipped ${skipped}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
