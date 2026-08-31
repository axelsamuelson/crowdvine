/**
 * Scenario defaults derived from live catalog assortment (not frozen snapshots).
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  fetchExchangeRateToSekStrict,
  resolvePurchaseCostCentsForContribution,
} from "@/lib/exchange-rate-strict";
import { resolveWineAlcoholTaxCents } from "@/lib/wine-retail-pricing";

export type AssortmentPurchaseCostDefaults = {
  /** Median producer purchase cost per bottle, SEK (excl. excise). */
  medianPurchaseCostSek: number | null;
  /** Same as median, öre. */
  medianPurchaseCostCents: number | null;
  /** Wines included in the median (is_live, cost > 0, reliable FX). */
  sampleSize: number;
  /** Live wines skipped (missing FX or invalid cost). */
  skippedCount: number;
};

export type AssortmentWineCostRow = {
  id: string;
  wineName: string;
  vintage: number | null;
  purchaseCostCents: number;
  exciseCents: number;
  costCurrency: string;
};

/** Median of a non-empty numeric list (average of two middles when even). */
export function medianOf(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

async function loadLiveWinesWithCosts(): Promise<{
  wines: Array<Record<string, unknown>>;
  rateMap: Record<string, number>;
}> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("wines")
    .select(
      "id, wine_name, vintage, cost_amount, cost_currency, exchange_rate, alcohol_tax_cents, is_live, available_for_sale",
    )
    .eq("is_live", true)
    .gt("cost_amount", 0)
    .order("wine_name");

  if (error) {
    console.error("[finance] assortment wines:", error.message);
    return { wines: [], rateMap: { SEK: 1 } };
  }

  const wines = (data ?? []).filter(
    (w) =>
      (w as { available_for_sale?: boolean | null }).available_for_sale !==
      false,
  ) as Array<Record<string, unknown>>;

  const currenciesNeedingLiveFx = new Set<string>();
  for (const w of wines) {
    const currency = String(w.cost_currency || "SEK").toUpperCase();
    if (currency === "SEK") continue;
    const stored = w.exchange_rate;
    if (
      stored == null ||
      !Number.isFinite(Number(stored)) ||
      Number(stored) <= 0
    ) {
      currenciesNeedingLiveFx.add(currency);
    }
  }

  const rateMap: Record<string, number> = { SEK: 1 };
  for (const currency of currenciesNeedingLiveFx) {
    const live = await fetchExchangeRateToSekStrict(currency);
    if (live?.rate) rateMap[currency] = live.rate;
  }

  return { wines, rateMap };
}

/**
 * Median purchase cost (öre/bottle, excl. alcohol tax) across live assortment wines.
 */
export async function loadAssortmentPurchaseCostDefaults(): Promise<AssortmentPurchaseCostDefaults> {
  const empty: AssortmentPurchaseCostDefaults = {
    medianPurchaseCostSek: null,
    medianPurchaseCostCents: null,
    sampleSize: 0,
    skippedCount: 0,
  };

  const { wines, rateMap } = await loadLiveWinesWithCosts();
  const costsCents: number[] = [];
  let skippedCount = 0;

  for (const w of wines) {
    const resolved = resolvePurchaseCostCentsForContribution(
      {
        cost_amount: Number(w.cost_amount),
        cost_currency: w.cost_currency as string | null,
        exchange_rate: w.exchange_rate as number | null,
      },
      rateMap,
    );
    if (!resolved.ok || resolved.cents <= 0) {
      skippedCount += 1;
      continue;
    }
    costsCents.push(resolved.cents);
  }

  const medianCentsRaw = medianOf(costsCents);
  if (medianCentsRaw == null) {
    return { ...empty, skippedCount };
  }

  const medianPurchaseCostCents = Math.round(medianCentsRaw);
  return {
    medianPurchaseCostCents,
    medianPurchaseCostSek:
      Math.round((medianPurchaseCostCents / 100) * 100) / 100,
    sampleSize: costsCents.length,
    skippedCount,
  };
}

/**
 * Live assortment wines with resolved purchase cost (öre) and excise (öre).
 */
export async function loadAssortmentWineCostRows(): Promise<
  AssortmentWineCostRow[]
> {
  const { wines, rateMap } = await loadLiveWinesWithCosts();
  const rows: AssortmentWineCostRow[] = [];

  for (const w of wines) {
    const resolved = resolvePurchaseCostCentsForContribution(
      {
        cost_amount: Number(w.cost_amount),
        cost_currency: w.cost_currency as string | null,
        exchange_rate: w.exchange_rate as number | null,
      },
      rateMap,
    );
    if (!resolved.ok || resolved.cents <= 0) continue;
    rows.push({
      id: String(w.id),
      wineName: String(w.wine_name || "Vin"),
      vintage: w.vintage != null ? Number(w.vintage) : null,
      purchaseCostCents: resolved.cents,
      exciseCents: resolveWineAlcoholTaxCents(
        w.alcohol_tax_cents as number | null | undefined,
      ),
      costCurrency: String(w.cost_currency || "SEK").toUpperCase(),
    });
  }

  return rows;
}
