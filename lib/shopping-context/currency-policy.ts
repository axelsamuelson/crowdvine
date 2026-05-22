import type { ResolvedActiveGeoZone } from "@/lib/market/resolve-active-geo-zone";

/** US commerce zones display prices in USD (legacy seeds used SEK). */
export function isUsCommerceZone(
  zone: Pick<ResolvedActiveGeoZone, "countryCode" | "marketCode">,
): boolean {
  const cc = zone.countryCode?.trim().toUpperCase();
  if (cc === "US") return true;
  const mc = zone.marketCode?.trim().toUpperCase();
  return mc === "US";
}

export type ResolveDisplayCurrencyInput = {
  zoneCurrencyCode?: string | null;
  marketCurrencyCode?: string | null;
  countryCode?: string;
  marketCode?: string;
};

/**
 * Resolved display currency for prices and Stripe.
 * US zones/markets → USD unless the zone explicitly sets a non-SEK currency.
 */
export function resolveDisplayCurrencyCode(
  input: ResolveDisplayCurrencyInput,
): string {
  const countryCode = input.countryCode?.trim().toUpperCase() ?? "";
  const marketCode = input.marketCode?.trim().toUpperCase() ?? "";
  const zoneCur = input.zoneCurrencyCode?.trim().toUpperCase() ?? "";
  const marketCur = input.marketCurrencyCode?.trim().toUpperCase() ?? "";

  if (isUsCommerceZone({ countryCode, marketCode })) {
    if (zoneCur && zoneCur !== "SEK") return zoneCur;
    return "USD";
  }

  if (zoneCur) return zoneCur;
  if (marketCur) return marketCur;
  return "SEK";
}

/** Client-safe fallback when exchange-rates API is not available yet. */
export function fallbackSekToDisplayRate(currencyCode: string): number {
  const target = currencyCode.trim().toUpperCase();
  if (!target || target === "SEK") return 1;
  const sekPerUnit: Record<string, number> = {
    USD: 10.5,
    EUR: 11.25,
    GBP: 13.2,
  };
  const sek = sekPerUnit[target];
  return sek && sek > 0 ? 1 / sek : 1;
}
