/**
 * Isolates dual-offer checkout from legacy shared-pallet Pay / PI prefetch
 * until the customer clicks buy on a payable shared-pallet quote.
 *
 * Owner flow (shared pallet, DIRECT off):
 * buy → card field (SetupIntent / Payment Element, card only) →
 * confirm SetupIntent → reservation (charged when pallet closes).
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
  /**
   * After dual-offer buy on a live shared-pallet quote, unlocks the same
   * SetupIntent + Payment Element + confirm→reservation path as legacy.
   */
  sharedPalletCardStepUnlocked?: boolean;
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

/**
 * Shared-pallet Stripe Elements / PI prefetch / place-reservation.
 * Flag OFF → always allowed. Flag ON → blocked until buy unlocks the card step.
 */
export function mayRunLegacySharedPalletPaymentUi(
  args: DualOfferReviewIsolationInput,
): boolean {
  if (!isDualOfferReviewCheckoutActive(args)) return true;
  return args.sharedPalletCardStepUnlocked === true;
}

/**
 * Whether dual-offer buy may open the card-save step for this quote.
 * Requires live shared-pallet catalog pricing (not synthetic / unavailable).
 */
export function mayStartSharedPalletCardSave(args: {
  offer: string | null | undefined;
  pricing_source: string | null | undefined;
  unavailable_reason?: string | null;
}): boolean {
  if (args.offer !== "shared_pallet") return false;
  if (args.pricing_source !== "live_catalog") return false;
  if (args.unavailable_reason) return false;
  return true;
}
