/**
 * Checkout charge-timing copy must follow the server payment mode.
 *
 * Footer (`checkoutChargeTimingMessageKey`):
 * - payment_intent → charged on confirm ("Pay now")
 * - setup_intent (shared pallet) → deferred until pallet closes
 * - setup_intent (US conditional) / unknown / loading / error → omit
 *   (no false promise either way)
 *
 * Primary CTA (`checkoutPlaceOrderCtaMessageKey`):
 * - same mode rules; unknown/loading/error must not use
 *   `placeReservationWithPayment` (that string promises pallet-close timing)
 */
export type CheckoutPaymentMode = "payment_intent" | "setup_intent";

export type ChargeTimingCopyKey =
  | "chargedOnConfirm"
  | "noChargeUntilPalletCloses";

export type CheckoutPlaceOrderCtaKey =
  | "processing"
  | "payNow"
  | "usConditionalButton"
  | "placeReservationWithPayment"
  | "placeReservation";

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

export function checkoutPlaceOrderCtaMessageKey(opts: {
  paymentMode: CheckoutPaymentMode | null | undefined;
  isUsConditional?: boolean;
  isSubmitting?: boolean;
}): { key: CheckoutPlaceOrderCtaKey; needsAmount: boolean } {
  if (opts.isSubmitting) {
    return { key: "processing", needsAmount: false };
  }
  if (opts.paymentMode === "payment_intent") {
    return { key: "payNow", needsAmount: false };
  }
  if (opts.paymentMode === "setup_intent") {
    if (opts.isUsConditional) {
      return { key: "usConditionalButton", needsAmount: false };
    }
    return { key: "placeReservationWithPayment", needsAmount: true };
  }
  // unknown / loading / error — no timing promise in the CTA
  return { key: "placeReservation", needsAmount: false };
}
