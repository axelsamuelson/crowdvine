/**
 * Public (pre-session) shipping display amounts for checkout step 1.
 * Same rate tables as authoritative quote — display only; quote still locks pay.
 */

import {
  customerShippingQuoteToSekMajor,
  rateChannelForFulfillmentMode,
  resolveCustomerShippingQuote,
  type CustomerShippingRateRow,
} from "@/lib/customer-shipping-pricing";
import type { FulfillmentChannel } from "@/lib/commerce/fulfillment-channel";

export type ShippingPreviewChannelAmount = {
  shipping_sek: number;
  complete: boolean;
  rate_channel: "pact" | "direct_box" | null;
  source: string;
};

export type ShippingPreviewResult = {
  country_code: string;
  bottle_count: number;
  shared_pallet: ShippingPreviewChannelAmount | null;
  direct_box: ShippingPreviewChannelAmount | null;
};

function previewForChannel(input: {
  channel: FulfillmentChannel;
  countryCode: string;
  bottleCount: number;
  productSubtotalSek: number;
  rates: CustomerShippingRateRow[];
}): ShippingPreviewChannelAmount {
  const rateChannel = rateChannelForFulfillmentMode(
    input.channel === "direct_box" ? "direct_box" : "shared_pallet",
  );
  const quote = resolveCustomerShippingQuote({
    channel: rateChannel,
    countryCode: input.countryCode,
    bottleCount: input.bottleCount,
    productSubtotalGrossCents: Math.max(
      0,
      Math.round((Number(input.productSubtotalSek) || 0) * 100),
    ),
    rates: input.rates,
    // Display preview: configured rates only — never invent legacy amortization.
    allowLegacyFallback: false,
  });
  const chargeable =
    quote.source === "configured_flat" || quote.source === "configured_free";
  return {
    shipping_sek: chargeable ? customerShippingQuoteToSekMajor(quote) : 0,
    complete: chargeable && quote.complete,
    rate_channel: quote.rateChannel,
    source: quote.source,
  };
}

/**
 * Build guest-visible shipping preview from loaded rate rows.
 * direct_box is omitted when `directBoxEnabled` is false.
 */
export function buildShippingPreview(input: {
  countryCode: string;
  bottleCount: number;
  productSubtotalSek?: number;
  rates: CustomerShippingRateRow[];
  directBoxEnabled: boolean;
}): ShippingPreviewResult {
  const country = String(input.countryCode || "")
    .trim()
    .toUpperCase();
  const bottles = Math.max(0, Math.floor(Number(input.bottleCount) || 0));
  const subtotal = Math.max(0, Number(input.productSubtotalSek) || 0);
  const shared = previewForChannel({
    channel: "shared_pallet",
    countryCode: country,
    bottleCount: bottles,
    productSubtotalSek: subtotal,
    rates: input.rates,
  });
  const direct = input.directBoxEnabled
    ? previewForChannel({
        channel: "direct_box",
        countryCode: country,
        bottleCount: bottles,
        productSubtotalSek: subtotal,
        rates: input.rates,
      })
    : null;
  return {
    country_code: country,
    bottle_count: bottles,
    shared_pallet: shared.complete ? shared : null,
    direct_box: input.directBoxEnabled
      ? direct && direct.complete
        ? direct
        : {
            shipping_sek: 0,
            complete: false,
            rate_channel: null,
            source: "missing_config",
          }
      : null,
  };
}

/** Prefer authoritative quote shipping; else public preview for the channel. */
export function resolveDisplayShippingSek(input: {
  fulfillmentChannel: FulfillmentChannel;
  quoteShippingSek: number | null | undefined;
  quoteReady: boolean;
  previewSharedSek: number | null | undefined;
  previewDirectSek: number | null | undefined;
}): number | null {
  if (
    input.quoteReady &&
    typeof input.quoteShippingSek === "number" &&
    Number.isFinite(input.quoteShippingSek)
  ) {
    return input.quoteShippingSek;
  }
  const preview =
    input.fulfillmentChannel === "direct_box"
      ? input.previewDirectSek
      : input.previewSharedSek;
  if (typeof preview === "number" && Number.isFinite(preview)) return preview;
  return null;
}
