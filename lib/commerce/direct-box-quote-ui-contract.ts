/**
 * Client/server quote contract for fulfillment-channel-aware checkout totals.
 * Keeps UI display aligned with PI / confirm mode-scoped fees.
 */

import type { CheckoutQuote } from "@/lib/checkout/checkout-quote";
import {
  parseFulfillmentChannel,
  type FulfillmentChannel,
} from "@/lib/commerce/fulfillment-channel";

export type QuoteUiStatus = "idle" | "loading" | "ready" | "error" | "stale";

/** Body sent to POST /api/checkout/quote — always includes fulfillment_channel. */
export function buildCheckoutQuoteRequestBody(input: {
  fulfillmentChannel: FulfillmentChannel;
  selectedPalletId?: string | null;
  countryCode?: string | null;
  pactPointsRedeem?: number;
  promoDiscountSek?: number;
}): Record<string, unknown> {
  const channel = input.fulfillmentChannel === "direct_box"
    ? "direct_box"
    : "shared_pallet";
  const body: Record<string, unknown> = {
    fulfillment_channel: channel,
    pact_points_redeem: Math.max(0, Math.floor(input.pactPointsRedeem ?? 0)),
  };
  if (channel === "shared_pallet" && input.selectedPalletId) {
    body.pallet_id = input.selectedPalletId;
  }
  if (input.countryCode) body.country_code = input.countryCode;
  if ((input.promoDiscountSek ?? 0) > 0) {
    body.promo_discount_sek = input.promoDiscountSek;
  }
  return body;
}

export function isQuoteBoundToChannel(
  quote: CheckoutQuote | null | undefined,
  channel: FulfillmentChannel,
): boolean {
  if (!quote) return false;
  const qCh = parseFulfillmentChannel(
    (quote as CheckoutQuote & { fulfillment_channel?: string }).fulfillment_channel,
  );
  // Legacy quotes without channel field are only valid for shared_pallet.
  if (!qCh) return channel === "shared_pallet";
  return qCh === channel;
}

/**
 * Block payment / delivery-complete when quote is missing, pending, errored,
 * or bound to the wrong channel. direct_box must never proceed on pact/99.
 */
export function shouldBlockCheckoutOnQuote(input: {
  fulfillmentChannel: FulfillmentChannel;
  quote: CheckoutQuote | null | undefined;
  quoteStatus: QuoteUiStatus;
}): { block: boolean; reason: string | null } {
  const { fulfillmentChannel, quote, quoteStatus } = input;
  if (quoteStatus === "loading" || quoteStatus === "stale") {
    return { block: true, reason: "quote_loading" };
  }
  if (quoteStatus === "error") {
    return { block: true, reason: "quote_error" };
  }
  if (!quote) {
    return { block: true, reason: "quote_missing" };
  }
  if (!isQuoteBoundToChannel(quote, fulfillmentChannel)) {
    return { block: true, reason: "quote_channel_mismatch" };
  }
  if (fulfillmentChannel === "direct_box") {
    if (quote.shipping_pending === true) {
      return { block: true, reason: "direct_box_shipping_pending" };
    }
    const rate =
      (quote as CheckoutQuote & { rate_channel?: string | null }).rate_channel ??
      null;
    if (rate === "pact") {
      return { block: true, reason: "direct_box_pact_rate_forbidden" };
    }
    if (!(Number(quote.shipping_sek) >= 0) || quote.shipping_sek == null) {
      return { block: true, reason: "direct_box_shipping_unquoted" };
    }
  }
  return { block: false, reason: null };
}

/** Shipping row needs a quote context for direct_box even without a pallet. */
export function checkoutHasShippingQuoteContext(input: {
  fulfillmentChannel: FulfillmentChannel;
  selectedPalletId?: string | null;
}): boolean {
  if (input.fulfillmentChannel === "direct_box") return true;
  return Boolean(input.selectedPalletId);
}
