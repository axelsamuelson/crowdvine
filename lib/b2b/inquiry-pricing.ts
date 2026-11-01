import type { SupabaseClient } from "@supabase/supabase-js";
import {
  aggregateB2BPalletStockWithFullPalletTotals,
  B2B_PALLET_ITEM_STOCK_SELECT,
} from "@/lib/b2b-pallet-stock";
import { getEffectiveExchangeRate } from "@/lib/b2b-wine-cost";
import { fetchExchangeRateToSekStrict } from "@/lib/exchange-rate-strict";
import {
  b2bExclVatSekToUnitPriceCents,
  computeInquiryB2bUnitPriceExclVatSek,
} from "@/lib/b2b/inquiry-price-math";
import type { B2bInquiryNormalized } from "@/lib/b2b/inquiry-validation";

export type InquiryWinePricingRow = {
  id: string;
  wine_name?: string | null;
  vintage?: string | null;
  cost_amount?: number | null;
  cost_currency?: string | null;
  exchange_rate?: number | null;
  alcohol_tax_cents?: number | null;
  b2b_margin_percentage?: number | null;
};

export {
  b2bExclVatSekToUnitPriceCents,
  computeInquiryB2bUnitPriceExclVatSek,
} from "@/lib/b2b/inquiry-price-math";

async function fetchShippingMap(
  sb: SupabaseClient,
  wineIds: string[],
): Promise<Map<string, number>> {
  if (wineIds.length === 0) return new Map();
  try {
    const { data: palletItems, error } = await sb
      .from("b2b_pallet_shipment_items")
      .select(B2B_PALLET_ITEM_STOCK_SELECT)
      .in("wine_id", wineIds)
      .eq("b2b_pallet_shipments.is_active", true);
    if (error) return new Map();
    const aggregated = await aggregateB2BPalletStockWithFullPalletTotals(
      sb,
      palletItems ?? [],
      { sellableOnly: true },
    );
    return aggregated.shippingMap;
  } catch {
    return new Map();
  }
}

async function buildRateMap(
  wines: InquiryWinePricingRow[],
): Promise<Record<string, number>> {
  const rateMap: Record<string, number> = { SEK: 1 };
  const currencies = new Set<string>();
  for (const w of wines) {
    const currency = String(w.cost_currency || "EUR").toUpperCase();
    if (currency !== "SEK") currencies.add(currency);
  }
  await Promise.all(
    [...currencies].map(async (currency) => {
      const live = await fetchExchangeRateToSekStrict(currency);
      if (live?.rate && Number.isFinite(live.rate)) {
        rateMap[currency] = live.rate;
      }
    }),
  );
  return rateMap;
}

/**
 * Overwrite each line's `unitPriceCents` from live wine + pallet shipping.
 * Never trusts client-submitted amounts.
 */
export async function applyServerInquiryLinePrices(
  sb: SupabaseClient,
  lines: B2bInquiryNormalized["lines"],
): Promise<B2bInquiryNormalized["lines"]> {
  const wineIds = [...new Set(lines.map((l) => l.wineId))];
  if (wineIds.length === 0) return lines;

  const { data: wineRows } = await sb
    .from("wines")
    .select(
      "id, wine_name, vintage, cost_amount, cost_currency, exchange_rate, alcohol_tax_cents, b2b_margin_percentage",
    )
    .in("id", wineIds);

  const wines = (Array.isArray(wineRows) ? wineRows : []) as InquiryWinePricingRow[];
  const byId = new Map(wines.map((w) => [w.id, w]));
  const [shippingMap, rateMap] = await Promise.all([
    fetchShippingMap(sb, wineIds),
    buildRateMap(wines),
  ]);

  return lines.map((line) => {
    const wine = byId.get(line.wineId);
    if (!wine) {
      return { ...line, unitPriceCents: null };
    }
    const currency = String(wine.cost_currency || "EUR").toUpperCase();
    const fallbackRate = getEffectiveExchangeRate(
      {
        cost_amount: wine.cost_amount ?? undefined,
        cost_currency: wine.cost_currency,
        exchange_rate: wine.exchange_rate,
        alcohol_tax_cents: wine.alcohol_tax_cents ?? undefined,
      },
      rateMap,
    );
    // Prefer live rate when present (matches shop products-data).
    const rate = currency === "SEK" ? 1 : (rateMap[currency] ?? fallbackRate);

    const unitSek = computeInquiryB2bUnitPriceExclVatSek({
      costAmount: wine.cost_amount ?? 0,
      exchangeRate: rate,
      alcoholTaxCents: wine.alcohol_tax_cents ?? 0,
      b2bMarginPercentage: wine.b2b_margin_percentage,
      shippingPerBottleSek: shippingMap.get(line.wineId) ?? 0,
    });

    return {
      ...line,
      unitPriceCents:
        unitSek != null ? b2bExclVatSekToUnitPriceCents(unitSek) : null,
    };
  });
}
