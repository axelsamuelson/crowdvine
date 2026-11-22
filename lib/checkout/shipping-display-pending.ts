/**
 * When checkout may show gray shipping placeholders after postal is known.
 *
 * Root cause (Camille 22/11): `shippingDisplayPending` also waited on
 * authenticated `/api/checkout/quote` (`quoteStatus === "loading"` /
 * `channelTotalsPending`). Guests only get that quote after
 * `ensure-session`, which runs after `deliveryComplete` (full address).
 * Public `POST /api/checkout/shipping-preview` already returns SEK at
 * postal — display must not wait on address/quote for those amounts.
 */

export type ShippingPreviewUiStatus =
  | "idle"
  | "loading"
  | "ready"
  | "missing";

export function resolveShippingDisplayPending(input: {
  hasPostalCode: boolean;
  /** Channel display amount already known (preview or quote). */
  shippingSek: number | null | undefined;
  shippingPreviewStatus: ShippingPreviewUiStatus;
}): boolean {
  if (!input.hasPostalCode) return false;
  if (
    typeof input.shippingSek === "number" &&
    Number.isFinite(input.shippingSek)
  ) {
    return false;
  }
  // Only the public preview gate — never authenticated quote / address.
  return (
    input.shippingPreviewStatus === "loading" ||
    input.shippingPreviewStatus === "idle"
  );
}

/** True when postal is set, preview finished without an amount, show retry. */
export function resolveShippingPreviewRetryVisible(input: {
  hasPostalCode: boolean;
  shippingSek: number | null | undefined;
  shippingPreviewStatus: ShippingPreviewUiStatus;
}): boolean {
  if (!input.hasPostalCode) return false;
  if (
    typeof input.shippingSek === "number" &&
    Number.isFinite(input.shippingSek)
  ) {
    return false;
  }
  return input.shippingPreviewStatus === "missing";
}
