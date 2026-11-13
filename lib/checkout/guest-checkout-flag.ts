/**
 * Shared-pallet guest checkout (anonymous SE visitors).
 * Default OFF — set GUEST_CHECKOUT_ENABLED=true to enable.
 *
 * When ON (and market is SE): mid-checkout OTP wall is skipped; a silent
 * ensure-session creates the Stripe/profile identity needed for off_session
 * pallet-close charging. An optional account claim is offered only on the
 * confirmation page.
 */

function envTruthy(value: string | undefined): boolean {
  const v = String(value ?? "")
    .trim()
    .toLowerCase();
  return v === "true" || v === "1" || v === "on";
}

export function isGuestCheckoutEnabled(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  return envTruthy(env.GUEST_CHECKOUT_ENABLED);
}
