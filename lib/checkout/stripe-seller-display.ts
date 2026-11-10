/**
 * Public seller name shown in Stripe Payment Element mandate / business option.
 * Defaults to the legal seller (matches checkout.sellingEntity). Override via
 * NEXT_PUBLIC_STRIPE_BUSINESS_NAME without touching Stripe Dashboard settings.
 */
export function stripePaymentElementBusinessName(): string {
  const fromEnv = process.env.NEXT_PUBLIC_STRIPE_BUSINESS_NAME?.trim();
  if (fromEnv) return fromEnv;
  return "EURPACT OÜ";
}

/** Public Geist Sans woff2 for Stripe Elements iframes (latin 400). */
export const STRIPE_GEIST_SANS_WOFF2 =
  "https://cdn.jsdelivr.net/npm/@fontsource/geist-sans@5.2.5/files/geist-sans-latin-400-normal.woff2";

/** Font family registered by Fontsource Geist Sans (@font-face). */
export const STRIPE_GEIST_FONT_FAMILY = "Geist Sans";
