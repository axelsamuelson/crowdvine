/**
 * Pure gates for checkout `deliveryComplete` (age/compliance unlock).
 *
 * Quote readiness must NOT block the age step — that created a guest deadlock
 * when DIRECT_BOX_CHECKOUT_ENABLED was on: deliveryComplete waited on
 * /api/checkout/quote (auth required), while ensure-session only ran after
 * deliveryComplete. Quote still gates payment separately.
 */

import {
  isDeliveryCompleteForChannel,
  resolveSharedPalletBudbeeEligibility,
  type CarrierEligibilityState,
  type DeliveryCompleteInput,
  type FulfillmentChannel,
} from "@/lib/commerce/fulfillment-channel";
import {
  shouldBlockCheckoutOnQuote,
  type QuoteUiStatus,
} from "@/lib/commerce/direct-box-quote-ui-contract";
import type { CheckoutQuote } from "@/lib/checkout/checkout-quote";

export type DeliveryCompleteGateInput = {
  directBoxCheckoutEnabled: boolean;
  fulfillmentChannel: FulfillmentChannel;
  hasZoneDeliveryReady: boolean;
  deliveryZoneReady: boolean;
  hasProducerItems: boolean;
  selectedPallet: { id: string } | null | undefined;
  isUsConditional: boolean;
  hasUsState: boolean;
  budbeeAvailable: boolean;
  /** Server-derived: direct_box row selectable. */
  directBoxDeliverySelectable: boolean;
};

/**
 * Address / channel readiness for unlocking age + ensure-session.
 * Intentionally ignores quote status.
 */
export function computeDeliveryCompleteForAgeUnlock(
  input: DeliveryCompleteGateInput,
): boolean {
  if (!input.directBoxCheckoutEnabled) {
    if (!input.hasZoneDeliveryReady) return false;
    if (input.isUsConditional) {
      if (!input.hasUsState) return false;
      return input.selectedPallet != null;
    }
    if (!input.deliveryZoneReady) return false;
    if (input.hasProducerItems) return input.selectedPallet != null;
    return true;
  }

  const carrier: CarrierEligibilityState =
    input.fulfillmentChannel === "direct_box"
      ? input.directBoxDeliverySelectable
        ? {
            status: "eligible",
            channel: "direct_box",
            carrierId: "server_authorized",
            productCode: "server_authorized",
          }
        : {
            status: "unavailable",
            channel: "direct_box",
            reason: "carrier_unconfigured",
            messageKey: "checkout.directBoxCarrierUnconfigured",
          }
      : resolveSharedPalletBudbeeEligibility({
          channel: "shared_pallet",
          budbeeAvailable: input.budbeeAvailable,
        });

  const channelInput: DeliveryCompleteInput = {
    channel: input.fulfillmentChannel,
    hasZoneDeliveryReady: input.hasZoneDeliveryReady,
    deliveryZoneReady: input.deliveryZoneReady,
    hasProducerItems: input.hasProducerItems,
    selectedPallet: input.selectedPallet,
    isUsConditional: input.isUsConditional,
    hasUsState: input.hasUsState,
    carrier,
  };
  return isDeliveryCompleteForChannel(channelInput);
}

/**
 * Payment / purchase CTA must still wait for a mode-scoped quote when
 * direct_box checkout is enabled.
 */
export function isCheckoutPurchaseBlockedByQuote(input: {
  directBoxCheckoutEnabled: boolean;
  fulfillmentChannel: FulfillmentChannel;
  quote: CheckoutQuote | null | undefined;
  quoteStatus: QuoteUiStatus;
}): boolean {
  if (!input.directBoxCheckoutEnabled) return false;
  return shouldBlockCheckoutOnQuote({
    fulfillmentChannel: input.fulfillmentChannel,
    quote: input.quote,
    quoteStatus: input.quoteStatus,
  }).block;
}
