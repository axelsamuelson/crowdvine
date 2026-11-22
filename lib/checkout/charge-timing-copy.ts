/**
 * Checkout charge-timing copy must follow the selected fulfillment channel
 * (and the matching Stripe intent once ready).
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
 *
 * Channel switches (and the initial Stripe wait) must update copy immediately
 * via `expectedCheckoutPaymentMode` — never leave stale SetupIntent / pallet
 * wording, or a neutral "Köp" CTA, while a PaymentIntent (or vice versa) is
 * still loading. Pair with a short `loadingPayment` status; keep the place
 * CTA disabled until the matching intent is ready.
 */
export type CheckoutPaymentMode = "payment_intent" | "setup_intent";

export type CheckoutFulfillmentChannel = "shared_pallet" | "direct_box";

export type ChargeTimingCopyKey =
  | "chargedOnConfirm"
  | "noChargeUntilPalletCloses";

export type CheckoutPlaceOrderCtaKey =
  | "processing"
  | "payNow"
  | "usConditionalButton"
  | "placeReservationWithPayment"
  | "placeReservation";

/**
 * Payment mode the UI must claim for the selected channel — independent of
 * whether Stripe has finished creating/reloading the matching intent.
 * direct_box is always immediate PaymentIntent; shared pallet is SetupIntent
 * (including US conditional card-verify).
 */
export function expectedCheckoutPaymentMode(opts: {
  fulfillmentChannel: CheckoutFulfillmentChannel;
}): CheckoutPaymentMode {
  return opts.fulfillmentChannel === "direct_box"
    ? "payment_intent"
    : "setup_intent";
}

/** True only when the live Stripe intent matches the selected channel. */
export function checkoutPaymentModeMatchesChannel(opts: {
  paymentMode: CheckoutPaymentMode | null | undefined;
  fulfillmentChannel: CheckoutFulfillmentChannel;
}): boolean {
  return (
    opts.paymentMode ===
    expectedCheckoutPaymentMode({
      fulfillmentChannel: opts.fulfillmentChannel,
    })
  );
}

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
