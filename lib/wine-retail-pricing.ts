import { getAppUrl } from "@/lib/app-url";

export const DEFAULT_ALCOHOL_TAX_CENTS = 2219;
const DEFAULT_MARGIN_PERCENTAGE = 10;

/** Standard Swedish alcohol tax per bottle (22,19 kr) when not set on the wine. */
export function resolveWineAlcoholTaxCents(
  alcoholTaxCents?: number | null,
): number {
  if (alcoholTaxCents != null && alcoholTaxCents > 0) {
    return alcoholTaxCents;
  }
  return DEFAULT_ALCOHOL_TAX_CENTS;
}

export type WinePricingDefaults = {
  margin_percentage?: number | null;
  price_includes_vat?: boolean | null;
  alcohol_tax_cents?: number | null;
  exchange_rate?: number | null;
};

/** B2C retail price in öre from cost + margin + VAT (same formula as admin bulk-margin). */
export function calculateRetailPriceCents(opts: {
  costAmount: number;
  exchangeRate: number;
  priceIncludesVat: boolean;
  marginPercentage: number;
  alcoholTaxCents?: number;
}): number | null {
  const exchangeRate = opts.exchangeRate || 1;
  const alcoholTaxInSek = (opts.alcoholTaxCents ?? DEFAULT_ALCOHOL_TAX_CENTS) / 100;
  const costAmountInSek = (opts.costAmount || 0) * exchangeRate;
  const costInSek = costAmountInSek + alcoholTaxInSek;

  const marginDecimal = (opts.marginPercentage || 0) / 100;
  const vatRate = opts.priceIncludesVat !== false ? 0.25 : 0;
  const denom = 1 - marginDecimal;
  if (denom <= 0) return null;

  const priceExVat = costInSek / denom;
  const finalPrice = priceExVat * (1 + vatRate);
  return Math.round(finalPrice * 100);
}

export async function fetchExchangeRateToSek(
  from: string,
  origin?: string,
): Promise<number> {
  if (!from || from === "SEK") return 1;
  try {
    const base = origin ?? getAppUrl();
    const url = new URL("/api/exchange-rates", base);
    url.searchParams.set("from", from);
    url.searchParams.set("to", "SEK");
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return 1;
    const data = (await res.json()) as { rate?: number };
    const rate = Number(data?.rate);
    return Number.isFinite(rate) && rate > 0 ? rate : 1;
  } catch {
    return 1;
  }
}

/**
 * When catalog/MCP sets import cost, derive B2C list price (base_price_cents) from margin formula.
 * import_price_eur / cost_amount takes precedence over explicit price_sek.
 */
export async function applyCostBasedRetailPricing(
  patch: Record<string, unknown>,
  existing?: Record<string, unknown> | null,
  opts?: { origin?: string; costWasUpdated?: boolean },
): Promise<Record<string, unknown>> {
  const costWasUpdated =
    opts?.costWasUpdated === true ||
    patch.cost_amount !== undefined ||
    patch.cost_currency !== undefined;

  if (!costWasUpdated) return patch;

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
  const alcoholTaxCents = Number(
    patch.alcohol_tax_cents ??
      existing?.alcohol_tax_cents ??
      DEFAULT_ALCOHOL_TAX_CENTS,
  );

  const storedRate = patch.exchange_rate ?? existing?.exchange_rate;
  const exchangeRate =
    costCurrency === "SEK"
      ? 1
      : storedRate != null && Number(storedRate) > 0
        ? Number(storedRate)
        : await fetchExchangeRateToSek(costCurrency, opts?.origin);

  const finalPriceCents = calculateRetailPriceCents({
    costAmount,
    exchangeRate,
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
    exchange_rate: exchangeRate,
    calculated_price_cents: finalPriceCents,
    base_price_cents: finalPriceCents,
  };
}
