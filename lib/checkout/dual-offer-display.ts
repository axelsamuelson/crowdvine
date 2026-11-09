/**
 * Display helpers for dual-offer compare UI (test/preview).
 * bottle_unit_price_sek is cart-weighted average: wines_subtotal / bottle_count.
 */

import type { OfferQuote } from "@/lib/checkout/offer-quote";

export function isMixedBottleBasket(quote: OfferQuote): boolean {
  const unitPrices = new Set(
    quote.wine_lines.map((l) => Number(l.unit_price_sek)),
  );
  return unitPrices.size > 1;
}

/** Customer dual-offer money: always whole kronor (no ',00' / '.00'). */
export function formatOfferSek(
  n: number | null | undefined,
  locale: "sv" | "en",
): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(locale === "sv" ? "sv-SE" : "en-SE", {
    style: "currency",
    currency: "SEK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

/** Whole kronor amount for legal CTA button text (no currency symbol). */
export function formatOfferTotalKr(
  n: number | null | undefined,
  locale: "sv" | "en",
): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(locale === "sv" ? "sv-SE" : "en-SE", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.round(n));
}
