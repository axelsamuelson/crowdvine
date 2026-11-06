/**
 * Checkout money + error helpers for channel-aware fulfilment.
 * Does not read or write customer_shipping_rates — fee resolution stays
 * in lib/checkout/resolve-checkout-shipping.ts (external config).
 *
 * CRITICAL: direct_box must NEVER silently reuse shared-pallet/`pact`
 * (legacy 99 SEK) customer rates. Mode-scoped quote required; else not_quoted.
 */

import {
  type CarrierEligibilityState,
  type FulfillmentChannel,
  mayPrefetchPaymentIntent,
  resolveConfirmChannelPersistence,
  resolveDirectBoxCarrierEligibility,
  resolvePostPaymentBookingTarget,
  resolveSharedPalletBudbeeEligibility,
  type DirectBoxCarrierConfig,
} from "@/lib/commerce/fulfillment-channel";
import { checkoutCustomerShippingCharge } from "@/lib/checkout/resolve-checkout-shipping";
import type {
  CustomerShippingChannel,
  CustomerShippingQuote,
} from "@/lib/customer-shipping-pricing";

export type ChannelCheckoutErrorCode =
  | "direct_box_disabled"
  | "direct_box_carrier_unconfigured"
  | "direct_box_not_quoted"
  | "direct_box_country_unsupported"
  | "shared_pallet_requires_pallet"
  | "budbee_postal_ineligible"
  | "shipping_fee_pending"
  | "carrier_channel_mismatch";

export function carrierStateToCheckoutError(
  state: CarrierEligibilityState,
): ChannelCheckoutErrorCode | null {
  if (state.status === "eligible") return null;
  switch (state.reason) {
    case "channel_disabled":
      return state.channel === "direct_box"
        ? "direct_box_disabled"
        : "carrier_channel_mismatch";
    case "carrier_unconfigured":
      return "direct_box_carrier_unconfigured";
    case "pending_contract":
    case "quote_pending":
    case "quoting_disabled":
      return "direct_box_not_quoted";
    case "country_unsupported":
      return "direct_box_country_unsupported";
    case "postal_ineligible":
      return "budbee_postal_ineligible";
    default:
      return "carrier_channel_mismatch";
  }
}

export type ModeScopedShippingQuoteInput = {
  source: CustomerShippingQuote["source"];
  shippingSek: number;
  /**
   * Rate-table channel that produced the quote.
   * direct_box requires `direct_box`; `pact`/null is rejected as not_quoted.
   */
  rateChannel?: CustomerShippingChannel | null;
};

/**
 * Pure gate: whether payment may include this shipping quote for the channel.
 * direct_box NEVER accepts pact/shared-pallet (99 SEK) or legacy amortization.
 */
export function shippingFeeForPayment(
  quote: ModeScopedShippingQuoteInput,
  channel: FulfillmentChannel = "shared_pallet",
): {
  shippingSek: number;
  shippingPending: boolean;
  ok: boolean;
  errorCode: ChannelCheckoutErrorCode | null;
} {
  if (channel === "direct_box") {
    if (quote.rateChannel !== "direct_box") {
      return {
        shippingSek: 0,
        shippingPending: true,
        ok: false,
        errorCode: "direct_box_not_quoted",
      };
    }
    if (
      quote.source !== "configured_flat" &&
      quote.source !== "configured_free"
    ) {
      return {
        shippingSek: 0,
        shippingPending: true,
        ok: false,
        errorCode: "direct_box_not_quoted",
      };
    }
    return {
      shippingSek: Math.max(0, quote.shippingSek),
      shippingPending: false,
      ok: true,
      errorCode: null,
    };
  }

  const charge = checkoutCustomerShippingCharge(quote);
  return {
    shippingSek: charge.shippingSek,
    shippingPending: charge.shippingPending,
    ok: !charge.shippingPending,
    errorCode: charge.shippingPending ? "shipping_fee_pending" : null,
  };
}

export type SimulatedCheckoutStep =
  | "delivery_choice"
  | "postcode_eligibility"
  | "shipping_fee"
  | "payment_contract"
  | "order_persistence"
  | "fulfillment_booking";

export type SimulatedCheckoutResult = {
  channel: FulfillmentChannel;
  stepFailed: SimulatedCheckoutStep | null;
  errorCode: ChannelCheckoutErrorCode | null;
  persistence: ReturnType<typeof resolveConfirmChannelPersistence> | null;
  paymentAllowed: boolean;
  booking: ReturnType<typeof resolvePostPaymentBookingTarget> | null;
};

/**
 * Isolated end-to-end simulation for tests — no Stripe, Instabee, or DB.
 */
export function simulateChannelCheckoutFlow(input: {
  channel: FulfillmentChannel;
  directBoxEnabled: boolean;
  directBoxCarrier: DirectBoxCarrierConfig | null;
  countryCode: string;
  budbeeAvailable: boolean | null;
  selectedPalletId: string | null;
  shippingQuote: ModeScopedShippingQuoteInput;
}): SimulatedCheckoutResult {
  const carrier =
    input.channel === "shared_pallet"
      ? resolveSharedPalletBudbeeEligibility({
          channel: input.channel,
          budbeeAvailable: input.budbeeAvailable,
        })
      : resolveDirectBoxCarrierEligibility({
          channel: input.channel,
          checkoutEnabled: input.directBoxEnabled,
          config: input.directBoxCarrier,
          countryCode: input.countryCode,
        });

  const carrierErr = carrierStateToCheckoutError(carrier);
  if (carrierErr) {
    return {
      channel: input.channel,
      stepFailed: "postcode_eligibility",
      errorCode: carrierErr,
      persistence: null,
      paymentAllowed: false,
      booking: null,
    };
  }

  if (
    input.channel === "shared_pallet" &&
    !String(input.selectedPalletId ?? "").trim()
  ) {
    return {
      channel: input.channel,
      stepFailed: "delivery_choice",
      errorCode: "shared_pallet_requires_pallet",
      persistence: null,
      paymentAllowed: false,
      booking: null,
    };
  }

  const fee = shippingFeeForPayment(input.shippingQuote, input.channel);
  if (!fee.ok) {
    return {
      channel: input.channel,
      stepFailed: "shipping_fee",
      errorCode: fee.errorCode ?? "shipping_fee_pending",
      persistence: null,
      paymentAllowed: false,
      booking: null,
    };
  }

  const paymentAllowed = mayPrefetchPaymentIntent({
    channel: input.channel,
    deliveryComplete: true,
    selectedPalletId: input.selectedPalletId,
    carrier,
  });
  if (!paymentAllowed) {
    return {
      channel: input.channel,
      stepFailed: "payment_contract",
      errorCode: "shared_pallet_requires_pallet",
      persistence: null,
      paymentAllowed: false,
      booking: null,
    };
  }

  const persistence = resolveConfirmChannelPersistence({
    channel: input.channel,
    selectedPalletId: input.selectedPalletId,
  });
  if ("error" in persistence) {
    return {
      channel: input.channel,
      stepFailed: "order_persistence",
      errorCode: "shared_pallet_requires_pallet",
      persistence,
      paymentAllowed: true,
      booking: null,
    };
  }

  const booking = resolvePostPaymentBookingTarget({
    channel: input.channel,
    carrier,
  });
  if (booking.action === "skip") {
    return {
      channel: input.channel,
      stepFailed: "fulfillment_booking",
      errorCode: "direct_box_carrier_unconfigured",
      persistence,
      paymentAllowed: true,
      booking,
    };
  }

  return {
    channel: input.channel,
    stepFailed: null,
    errorCode: null,
    persistence,
    paymentAllowed: true,
    booking,
  };
}
