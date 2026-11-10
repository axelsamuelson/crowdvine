/**
 * Pallet close-flow gate. Defaults OFF (defense in depth).
 *
 * Requires BOTH:
 * - PALLET_CLOSE_FLOW_ENABLED=true
 * - CHECKOUT_DUAL_OFFER_COMPARE=true
 *
 * Cron / runners must no-op when this returns false. Never enable via
 * dual-offer alone.
 */

function envTruthy(
  value: string | undefined,
): boolean {
  const v = String(value ?? "")
    .trim()
    .toLowerCase();
  return v === "true" || v === "1" || v === "on";
}

export function isPalletCloseFlowEnabled(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  return (
    envTruthy(env.PALLET_CLOSE_FLOW_ENABLED) &&
    envTruthy(env.CHECKOUT_DUAL_OFFER_COMPARE)
  );
}
