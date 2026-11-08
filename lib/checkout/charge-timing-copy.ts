/**
 * Checkout footer charge-timing copy must follow the server payment mode.
 *
 * - payment_intent → card is charged on confirm ("Pay now")
 * - setup_intent (shared pallet) → authorize now, charge when pallet closes/ships
 * - setup_intent (US conditional) → deferred wording lives elsewhere; avoid
 *   "pallet closes" which would be a false promise for that path
 * - unknown / loading / error → render nothing (no false promise either way)
 */
export type CheckoutPaymentMode = "payment_intent" | "setup_intent";

export type ChargeTimingCopyKey =
  | "chargedOnConfirm"
  | "noChargeUntilPalletCloses";

export function checkoutChargeTimingMessageKey(opts: {
  paymentMode: CheckoutPaymentMode | null | undefined;
  isUsConditional?: boolean;
}): ChargeTimingCopyKey | null {
  if (opts.paymentMode === "payment_intent") {
    return "chargedOnConfirm";
  }
  if (opts.paymentMode === "setup_intent") {
    if (opts.isUsConditional) return null;
    return "noChargeUntilPalletCloses";
  }
  return null;
}
