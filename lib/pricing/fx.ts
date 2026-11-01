/**
 * Explicit FX resolution for `lib/pricing/`.
 *
 * Two fallback behaviours exist today across surfaces; both are supported as
 * `FxSource` values so callers (and Axel) can choose without silent drift.
 */
import type { FxSource, PriceInput } from "@/lib/pricing/types";

/** Hardcoded SEK rates when live FX is unavailable (wine-retail-pricing today). */
export const FALLBACK_SEK_RATES: Readonly<Record<string, number>> = {
  EUR: 11.25,
  USD: 10.5,
  GBP: 13.2,
};

function normalizeCurrency(currency?: string | null): string {
  return (currency || "SEK").toUpperCase();
}

function positiveRate(rate: number | null | undefined): number | null {
  if (rate == null) return null;
  const n = Number(rate);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/**
 * Resolve the SEK exchange rate according to the configured FX source.
 *
 * @throws if `fxSource === "explicit"` and no positive rate is supplied
 */
export function resolveFxRate(
  fxSource: FxSource,
  input: Pick<
    PriceInput,
    "costCurrency" | "exchangeRate" | "rateMap"
  >,
): number {
  const currency = normalizeCurrency(input.costCurrency);
  const stored = positiveRate(input.exchangeRate);

  if (fxSource === "explicit") {
    if (stored == null) {
      throw new Error(
        'lib/pricing: fxSource "explicit" requires a positive exchangeRate',
      );
    }
    return stored;
  }

  if (currency === "SEK") return 1;

  if (fxSource === "retail_fallback") {
    // Matches resolveSekExchangeRateSync: stored → FALLBACK_SEK_RATES → 1
    if (stored != null) return stored;
    return FALLBACK_SEK_RATES[currency] ?? 1;
  }

  // b2b_cost_fallback — matches getEffectiveExchangeRate: stored → rateMap → 1
  if (stored != null) return stored;
  const fromMap = positiveRate(input.rateMap?.[currency]);
  return fromMap ?? 1;
}
