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

/**
 * Optional custom font for Stripe Elements iframes.
 * Stripe rejects `src` URLs containing `@` (e.g. jsDelivr `@fontsource/...`),
 * which produced "Invalid src value in font configuration" and flaky PE loads.
 * Prefer same-origin / CDN URLs without `@`, or omit fonts (Stripe default).
 */
export const STRIPE_GEIST_SANS_WOFF2: string | null = null;

/** Font family when STRIPE_GEIST_SANS_WOFF2 is set. */
export const STRIPE_GEIST_FONT_FAMILY = "Geist Sans";
