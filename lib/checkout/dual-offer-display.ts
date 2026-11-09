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

export function formatOfferSek(
  n: number | null | undefined,
  locale: "sv" | "en",
): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const whole = Math.abs(n - Math.round(n)) < 1e-9;
  return new Intl.NumberFormat(locale === "sv" ? "sv-SE" : "en-SE", {
    style: "currency",
    currency: "SEK",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(n);
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
