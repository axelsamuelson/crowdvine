import {
  getAppUrl,
  getAppUrlForRequest,
  getInternalFetchHeaders,
} from "@/lib/app-url";
import {
  DEFAULT_ALCOHOL_TAX_CENTS,
  resolveWineAlcoholTaxCents,
} from "@/lib/wine-alcohol-tax";

export { DEFAULT_ALCOHOL_TAX_CENTS, resolveWineAlcoholTaxCents };

const DEFAULT_MARGIN_PERCENTAGE = 10;

/** Hardcoded SEK rates when live FX is unavailable. Never use 1 for these. */
export const FALLBACK_SEK_RATES: Record<string, number> = {
  EUR: 11.25,
  USD: 10.5,
  GBP: 13.2,
};

export type WinePricingDefaults = {
  margin_percentage?: number | null;
  price_includes_vat?: boolean | null;
  alcohol_tax_cents?: number | null;
  exchange_rate?: number | null;
};

export type RetailPriceBreakdown = {
  isValid: boolean;
  exchangeRate: number;
  alcoholTaxInSek: number;
  costAmountInSek: number;
  costInSek: number;
  priceExVat: number;
  finalPrice: number;
  finalPriceCents: number;
  netProfitSek: number;
  vatAmountSek: number;
  vatRate: number;
};

/** Sync SEK rate: stored → fallback map → 1 only for SEK/unknown. */
export function resolveSekExchangeRateSync(
  currency: string,
  storedRate?: number | null,
): number {
  const code = (currency || "SEK").toUpperCase();
  if (code === "SEK") return 1;
  if (storedRate != null && Number.isFinite(Number(storedRate)) && Number(storedRate) > 0) {
    return Number(storedRate);
  }
  return FALLBACK_SEK_RATES[code] ?? 1;
}

/** B2C retail price in öre from cost + margin + VAT. */
export function calculateRetailPriceCents(opts: {
  costAmount: number;
  exchangeRate: number;
  priceIncludesVat: boolean;
  marginPercentage: number;
  alcoholTaxCents?: number;
}): number | null {
  const breakdown = buildRetailPriceBreakdown(opts);
  return breakdown.isValid ? breakdown.finalPriceCents : null;
}

/** Full B2C price breakdown — shared by admin calculator and server save. */
export function buildRetailPriceBreakdown(opts: {
  costAmount: number;
  exchangeRate: number;
  priceIncludesVat: boolean;
  marginPercentage: number;
  alcoholTaxCents?: number | null;
}): RetailPriceBreakdown {
  const exchangeRate =
    opts.exchangeRate > 0 && Number.isFinite(opts.exchangeRate)
      ? opts.exchangeRate
      : 1;
  const alcoholTaxInSek =
    resolveWineAlcoholTaxCents(opts.alcoholTaxCents) / 100;
  const costAmountInSek = (opts.costAmount || 0) * exchangeRate;
  const costInSek = costAmountInSek + alcoholTaxInSek;

  const marginDecimal = (opts.marginPercentage || 0) / 100;
  const vatRate = opts.priceIncludesVat !== false ? 0.25 : 0;
  const denom = 1 - marginDecimal;
  const isValid = denom > 0 && Number.isFinite(costInSek);

  const priceExVat = isValid ? costInSek / denom : 0;
  const finalPrice = isValid ? priceExVat * (1 + vatRate) : 0;
  const finalPriceCents = Math.round(finalPrice * 100);
  const netProfitSek = Math.max(0, priceExVat - costInSek);
  const vatAmountSek = Math.max(0, finalPrice - priceExVat);

  return {
    isValid,
    exchangeRate,
    alcoholTaxInSek,
    costAmountInSek,
    costInSek,
    priceExVat,
    finalPrice,
    finalPriceCents,
    netProfitSek,
    vatAmountSek,
    vatRate,
  };
}

/**
 * Reverse-solve gross margin % so cost + FX + tax + margin reproduce a retail price.
 * Nudges margin so the forward formula lands on the exact öre amount (avoids 163.00 → 163.01).
 */
export function implyMarginPercentageFromRetailPrice(opts: {
  retailPriceCents: number;
  costAmount: number;
  exchangeRate: number;
  priceIncludesVat: boolean;
  alcoholTaxCents?: number | null;
}): number | null {
  const targetCents = Math.round(opts.retailPriceCents || 0);
  const retail = targetCents / 100;
  if (!(retail > 0)) return null;

  const vatRate = opts.priceIncludesVat !== false ? 0.25 : 0;
  const priceExVat = retail / (1 + vatRate);
  const exchangeRate =
    opts.exchangeRate > 0 && Number.isFinite(opts.exchangeRate)
      ? opts.exchangeRate
      : 1;
  const alcoholTaxCents = resolveWineAlcoholTaxCents(opts.alcoholTaxCents);
  const alcoholTaxInSek = alcoholTaxCents / 100;
  const costAmount = opts.costAmount || 0;
  const costInSek = costAmount * exchangeRate + alcoholTaxInSek;

  if (!(priceExVat > 0) || !(costInSek > 0) || costInSek >= priceExVat) {
    return null;
  }

  const exact = (1 - costInSek / priceExVat) * 100;
  if (!(exact >= 0) || !(exact < 100)) return null;

  const priceAt = (marginPercentage: number) =>
    calculateRetailPriceCents({
      costAmount,
      exchangeRate,
      priceIncludesVat: opts.priceIncludesVat !== false,
      marginPercentage,
      alcoholTaxCents,
    });

  // 4 decimals keeps most round-trips exact; nudge if öre still drifts.
  let margin = Math.round(exact * 10000) / 10000;
  if (priceAt(margin) === targetCents) return margin;

  for (let step = 1; step <= 500; step++) {
    for (const sign of [-1, 1] as const) {
      const candidate =
        Math.round((margin + sign * step * 0.0001) * 10000) / 10000;
      if (candidate < 0 || candidate >= 100) continue;
      if (priceAt(candidate) === targetCents) return candidate;
    }
  }

  // Last resort: 2-decimal margin (may be ±1 öre off)
  return Math.round(exact * 100) / 100;
}

export async function fetchExchangeRateToSek(
  from: string,
  origin?: string,
): Promise<number> {
  const code = (from || "").toUpperCase();
  if (!code || code === "SEK") return 1;

  try {
    const base = origin ?? (await getAppUrlForRequest().catch(() => getAppUrl()));
    const url = new URL("/api/exchange-rates", base);
    url.searchParams.set("from", code);
    url.searchParams.set("to", "SEK");
    const res = await fetch(url.toString(), {
      cache: "no-store",
      headers: getInternalFetchHeaders(),
    });
    if (res.ok) {
      const data = (await res.json()) as { rate?: number };
      const rate = Number(data?.rate);
      if (Number.isFinite(rate) && rate > 0) return rate;
    }
  } catch {
    // fall through to hardcoded fallback
  }

  return resolveSekExchangeRateSync(code);
}

/**
 * When catalog/MCP sets import cost or margin, derive B2C list price from the margin formula.
 */
export async function applyCostBasedRetailPricing(
  patch: Record<string, unknown>,
  existing?: Record<string, unknown> | null,
  opts?: { origin?: string; costWasUpdated?: boolean },
): Promise<Record<string, unknown>> {
  const shouldRecalc =
    opts?.costWasUpdated === true ||
    patch.cost_amount !== undefined ||
    patch.cost_currency !== undefined ||
    patch.margin_percentage !== undefined ||
    patch.price_includes_vat !== undefined ||
    patch.alcohol_tax_cents !== undefined ||
    patch.exchange_rate !== undefined;

  if (!shouldRecalc) return patch;

  const costAmount = Number(patch.cost_amount ?? existing?.cost_amount ?? 0);
  if (!Number.isFinite(costAmount) || costAmount <= 0) return patch;

  const costCurrency = String(
    patch.cost_currency ?? existing?.cost_currency ?? "EUR",
  );
  const marginPercentage = Number(
    patch.margin_percentage ??
      existing?.margin_percentage ??
      DEFAULT_MARGIN_PERCENTAGE,
  );
  const priceIncludesVat =
    patch.price_includes_vat ?? existing?.price_includes_vat ?? true;
  const alcoholTaxCents = resolveWineAlcoholTaxCents(
    Number(
      patch.alcohol_tax_cents ??
        existing?.alcohol_tax_cents ??
        DEFAULT_ALCOHOL_TAX_CENTS,
    ),
  );

  const storedRate = patch.exchange_rate ?? existing?.exchange_rate;
  const exchangeRate =
    costCurrency.toUpperCase() === "SEK"
      ? 1
      : storedRate != null && Number(storedRate) > 0
        ? Number(storedRate)
        : await fetchExchangeRateToSek(costCurrency, opts?.origin);

  // Guard: never price EUR/USD/GBP as if rate were 1
  const safeRate =
    costCurrency.toUpperCase() === "SEK"
      ? 1
      : exchangeRate > 1.5
        ? exchangeRate
        : resolveSekExchangeRateSync(costCurrency);

  const finalPriceCents = calculateRetailPriceCents({
    costAmount,
    exchangeRate: safeRate,
    priceIncludesVat: priceIncludesVat !== false,
    marginPercentage,
    alcoholTaxCents,
  });

  if (finalPriceCents == null) return patch;

  return {
    ...patch,
    cost_amount: costAmount,
    cost_currency: costCurrency,
    margin_percentage: marginPercentage,
    price_includes_vat: priceIncludesVat !== false,
    alcohol_tax_cents: alcoholTaxCents,
    exchange_rate: safeRate,
    calculated_price_cents: finalPriceCents,
    base_price_cents: finalPriceCents,
  };
}
