/**
 * Phase 1 market feature flags (server vs client).
 *
 * US conditional reservations require explicit enablement in each environment.
 * TODO: admin / test-user allowlist override (not implemented in Phase 1).
 */

/** Server-only: Stripe and API routes must use this. */
export function isUsConditionalReservationsEnabledServer(): boolean {
  return process.env.ENABLE_US_CONDITIONAL_RESERVATIONS === "true";
}

/**
 * Client bundles: keep checkout UX in sync with server when both are set.
 * If only server is true, API allows payment but UI may still show EU flow unless this is set.
 */
export function isUsConditionalReservationsEnabledClient(): boolean {
  if (typeof process === "undefined") return false;
  return process.env.NEXT_PUBLIC_ENABLE_US_CONDITIONAL_RESERVATIONS === "true";
}
