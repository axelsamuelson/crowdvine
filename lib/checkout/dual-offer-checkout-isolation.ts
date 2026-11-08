/**
 * Isolates dual-offer REVIEW checkout from legacy shared-pallet Pay / PI prefetch.
 * When active: no payment-intent create/prefetch and no place-reservation CTA.
 * Does NOT enable dual-offer live payment/order binding.
 */

export type DualOfferReviewIsolationInput = {
  /** Server-gated surface allow (flag + non-production). */
  dualOfferCompareSurfaceAllowed: boolean;
  /** Destination is quoteable (pallet known). */
  hasSelectedPallet: boolean;
  /** Delivery preview ready for the destination. */
  deliveryPreviewReady: boolean;
  /** Zone still loading — not yet a stable dual surface. */
  zoneLoading?: boolean;
};

/**
 * True only while dual-offer compare surface is allowed AND the dual panel
 * would mount (quoteable destination). Flag OFF → always false.
 */
export function isDualOfferReviewCheckoutActive(
  args: DualOfferReviewIsolationInput,
): boolean {
  if (!args.dualOfferCompareSurfaceAllowed) return false;
  if (args.zoneLoading) return false;
  if (!args.hasSelectedPallet) return false;
  if (!args.deliveryPreviewReady) return false;
  return true;
}

/** Legacy Stripe Elements / Pay / PI prefetch must stay disabled. */
export function mayRunLegacySharedPalletPaymentUi(
  args: DualOfferReviewIsolationInput,
): boolean {
  return !isDualOfferReviewCheckoutActive(args);
}
