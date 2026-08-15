/**
 * Strict FX helpers for contribution / freight economics.
 *
 * Never silently use FX = 1 for non-SEK currencies.
 * Rejects API responses marked as fallback.
 */

import { getAppUrl } from "@/lib/app-url";
import type { WineCostFields } from "@/lib/b2b-wine-cost";

export type StrictFxResult =
  | { ok: true; rate: number; source: "stored" | "rate_map" | "live"; fallback: false }
  | { ok: false; reason: string };

/**
 * Fetch EUR/SEK (or other→SEK) for economics. Returns null on failure.
 * Does not accept fallback rates from /api/exchange-rates.
 */
export async function fetchExchangeRateToSekStrict(
  from: string,
  origin?: string,
): Promise<{ rate: number; fallback: boolean } | null> {
  const currency = (from || "").toUpperCase();
  if (!currency) return null;
  if (currency === "SEK") return { rate: 1, fallback: false };

  try {
    const base = origin ?? getAppUrl();
    const url = new URL("/api/exchange-rates", base);
    url.searchParams.set("from", currency);
    url.searchParams.set("to", "SEK");
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      rate?: number;
      fallback?: boolean;
    };
    const rate = Number(data?.rate);
    if (!Number.isFinite(rate) || rate <= 0) return null;
    if (data.fallback === true) return null;
    return { rate, fallback: false };
  } catch {
    return null;
  }
}

/**
 * Resolve purchase FX for contribution snapshots.
 * Prefer wine.exchange_rate, then rateMap, then (caller may pass live).
 * Never falls back to 1 for non-SEK.
 */
export function resolvePurchaseFxForContribution(
  wine: WineCostFields,
  rateMap?: Record<string, number>,
): StrictFxResult {
  const currency = (wine.cost_currency || "SEK").toUpperCase();
  if (currency === "SEK") {
    return { ok: true, rate: 1, source: "stored", fallback: false };
  }
  if (wine.exchange_rate != null && Number.isFinite(Number(wine.exchange_rate))) {
    const rate = Number(wine.exchange_rate);
    if (rate > 0) {
      return { ok: true, rate, source: "stored", fallback: false };
    }
  }
  const mapped = rateMap?.[currency];
  if (mapped != null && Number.isFinite(Number(mapped)) && Number(mapped) > 0) {
    return {
      ok: true,
      rate: Number(mapped),
      source: "rate_map",
      fallback: false,
    };
  }
  return {
    ok: false,
    reason: `Missing reliable FX for ${currency}→SEK`,
  };
}

export function resolvePurchaseCostCentsForContribution(
  wine: WineCostFields,
  rateMap?: Record<string, number>,
):
  | { ok: true; cents: number; fxRate: number; currency: string }
  | { ok: false; reason: string; currency: string } {
  const currency = (wine.cost_currency || "SEK").toUpperCase();
  const costAmount = Number(wine.cost_amount ?? 0);
  if (!Number.isFinite(costAmount) || costAmount < 0) {
    return { ok: false, reason: "Invalid cost_amount", currency };
  }
  const fx = resolvePurchaseFxForContribution(wine, rateMap);
  if (!fx.ok) {
    return { ok: false, reason: fx.reason, currency };
  }
  return {
    ok: true,
    cents: Math.round(costAmount * fx.rate * 100),
    fxRate: fx.rate,
    currency,
  };
}
