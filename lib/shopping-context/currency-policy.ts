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
 * Server-rendered prices and Stripe charges stay in SEK.
 * A non-SE ship-to shows an approximate amount in the browser only.
 */
export function resolveDisplayCurrencyCode(
  _input: ResolveDisplayCurrencyInput,
): string {
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
