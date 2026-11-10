/**
 * Dual-offer checkout surface gates.
 * Flag defaults OFF. Even when flag is ON, production (non-preview) is denied.
 * Does NOT enable DIRECT_BOX_CHECKOUT_ENABLED.
 */

import { isDualOfferCompareEnabled } from "@/lib/checkout/offer-quote";

/**
 * Preview / local / Vercel preview only. Production deploy with flag
 * accidentally set still returns false.
 */
export function isDualOfferCheckoutSurfaceAllowed(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  if (!isDualOfferCompareEnabled(env)) return false;
  const nodeEnv = String(env.NODE_ENV ?? "").trim();
  const vercelEnv = String(env.VERCEL_ENV ?? "").trim();
  // Deny real production hosts; allow local (development/test) and Vercel preview.
  if (nodeEnv === "production" && vercelEnv !== "preview") {
    return false;
  }
  return true;
}
