/**
 * Pallet close-flow gate. Defaults OFF.
 * Uses CHECKOUT_DUAL_OFFER_COMPARE as the existing off-by-default flag so
 * production stays inert until that compare surface is intentionally enabled.
 * Optional PALLET_CLOSE_FLOW_ENABLED=true can force-enable in preview without
 * dual-offer UI; =false forces off even if compare is on.
 */

export function isPalletCloseFlowEnabled(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  const forced = String(env.PALLET_CLOSE_FLOW_ENABLED ?? "")
    .trim()
    .toLowerCase();
  if (forced === "false" || forced === "0" || forced === "off") return false;
  if (forced === "true" || forced === "1" || forced === "on") return true;
  return (
    String(env.CHECKOUT_DUAL_OFFER_COMPARE ?? "")
      .trim()
      .toLowerCase() === "true"
  );
}
