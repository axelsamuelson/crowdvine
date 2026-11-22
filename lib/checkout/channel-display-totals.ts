/**
 * Channel-scoped checkout money for the order summary.
 * Never paint a quote bound to a different fulfillment channel (Camille:
 * Delsumma stayed on shared-pallet catalog while lines showed direct +5%).
 */

import type { CheckoutQuote } from "@/lib/checkout/checkout-quote";
import type { FulfillmentChannel } from "@/lib/commerce/fulfillment-channel";
import { isQuoteBoundToChannel } from "@/lib/commerce/direct-box-quote-ui-contract";

export function selectChannelBoundQuote(
  quote: CheckoutQuote | null | undefined,
  channel: FulfillmentChannel,
): CheckoutQuote | null {
  if (!quote) return null;
  return isQuoteBoundToChannel(quote, channel) ? quote : null;
}

/**
 * Which channel’s bottle prices the order summary should paint.
 *
 * Camille 22/11 21:18: before postal, kassa showed direct +5% (183 kr) while
 * PDP/pallet was 174 kr — channel state can be `direct_box` before a delivery
 * method is chosen. Direct markup is only for when Direktleverans is actually
 * selected after a postal is known.
 */
export function resolveCheckoutPricingChannel(input: {
  fulfillmentChannel: FulfillmentChannel;
  hasPostalCode: boolean;
}): FulfillmentChannel {
  if (!input.hasPostalCode) return "shared_pallet";
  return input.fulfillmentChannel;
}

/** True only when Direktleverans is selected and postal is known. */
export function shouldShowDirectBoxLinePrices(input: {
  fulfillmentChannel: FulfillmentChannel;
  hasPostalCode: boolean;
}): boolean {
  return (
    resolveCheckoutPricingChannel(input) === "direct_box"
  );
}

/**
 * Subtotal for the selected channel: bound quote, else client preview
 * (catalog for shared_pallet, catalog×markup whole kronor for direct_box).
 */
export function resolveChannelDisplaySubtotalSek(input: {
  channel: FulfillmentChannel;
  boundQuote: CheckoutQuote | null;
  sharedClientSubtotalSek: number;
  directClientSubtotalSek: number;
}): number {
  if (input.boundQuote && typeof input.boundQuote.subtotal_sek === "number") {
    return input.boundQuote.subtotal_sek;
  }
  return input.channel === "direct_box"
    ? input.directClientSubtotalSek
    : input.sharedClientSubtotalSek;
}

/** Total when shipping for this channel is known; null → show skeleton. */
export function resolveChannelDisplayTotalSek(input: {
  boundQuote: CheckoutQuote | null;
  subtotalSek: number;
  shippingSek: number | null;
  pactPointsSekOff?: number;
  promoDiscountSek?: number;
}): number | null {
  if (input.boundQuote && typeof input.boundQuote.total_sek === "number") {
    return input.boundQuote.total_sek;
  }
  if (input.shippingSek == null || !Number.isFinite(input.shippingSek)) {
    return null;
  }
  const pact = Math.max(0, Number(input.pactPointsSekOff) || 0);
  const promo = Math.max(0, Number(input.promoDiscountSek) || 0);
  return Math.max(0, input.subtotalSek + input.shippingSek - pact - promo);
}
