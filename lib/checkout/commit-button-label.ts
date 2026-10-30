/**
 * Message keys and helpers for the checkout button that finalises a
 * reservation/order (distansavtalslagen / EU “button solution”).
 *
 * The button text itself must unambiguously state the payment obligation
 * and show the amount the customer commits to.
 */

export type CheckoutCommitPaymentMode =
  | "setup_intent"
  | "payment_intent"
  | null;

export type CheckoutCommitMessageKey =
  | "checkout.processing"
  | "checkout.payNow"
  | "checkout.usConditionalButton"
  | "checkout.placeReservationWithPayment";

export function checkoutCommitMessageKey(opts: {
  isSubmitting: boolean;
  paymentMode: CheckoutCommitPaymentMode;
  isUsConditional: boolean;
}): CheckoutCommitMessageKey {
  if (opts.isSubmitting) return "checkout.processing";
  if (opts.paymentMode === "payment_intent") return "checkout.payNow";
  if (opts.isUsConditional) return "checkout.usConditionalButton";
  return "checkout.placeReservationWithPayment";
}

/** Keys whose template includes `{amount}` and must stay in sync with the total. */
export function checkoutCommitMessageNeedsAmount(
  key: CheckoutCommitMessageKey,
): boolean {
  return key !== "checkout.processing";
}
