import { describe, expect, it } from "vitest";
import {
  buildCheckoutQuoteRequestBody,
  checkoutHasShippingQuoteContext,
  isQuoteBoundToChannel,
  shouldBlockCheckoutOnQuote,
} from "@/lib/commerce/direct-box-quote-ui-contract";
import type { CheckoutQuote } from "@/lib/checkout/checkout-quote";

const directQuote: CheckoutQuote = {
  subtotal_sek: 1200,
  shipping_sek: 149,
  promo_discount_sek: 0,
  voucher_discount_sek: 0,
  pact_points_sek: 0,
  pact_points_redeem: 0,
  total_sek: 1349,
  total_ore: 134900,
  shipping_pending: false,
  fulfillment_channel: "direct_box",
  rate_channel: "direct_box",
};

describe("direct-box quote UI contract", () => {
  it("builds quote body with fulfillment_channel (no pallet for direct)", () => {
    expect(
      buildCheckoutQuoteRequestBody({
        fulfillmentChannel: "direct_box",
        selectedPalletId: "leftover",
        countryCode: "SE",
        pactPointsRedeem: 10,
      }),
    ).toEqual({
      fulfillment_channel: "direct_box",
      pact_points_redeem: 10,
      country_code: "SE",
    });
    expect(
      buildCheckoutQuoteRequestBody({
        fulfillmentChannel: "shared_pallet",
        selectedPalletId: "pal-1",
      }),
    ).toMatchObject({
      fulfillment_channel: "shared_pallet",
      pallet_id: "pal-1",
    });
  });

  it("blocks on loading/stale/error/missing/pact for direct", () => {
    expect(
      shouldBlockCheckoutOnQuote({
        fulfillmentChannel: "direct_box",
        quote: null,
        quoteStatus: "loading",
      }).block,
    ).toBe(true);
    expect(
      shouldBlockCheckoutOnQuote({
        fulfillmentChannel: "direct_box",
        quote: directQuote,
        quoteStatus: "stale",
      }).block,
    ).toBe(true);
    expect(
      shouldBlockCheckoutOnQuote({
        fulfillmentChannel: "direct_box",
        quote: {
          ...directQuote,
          rate_channel: "pact",
          shipping_sek: 99,
        },
        quoteStatus: "ready",
      }).reason,
    ).toBe("direct_box_pact_rate_forbidden");
    expect(
      shouldBlockCheckoutOnQuote({
        fulfillmentChannel: "direct_box",
        quote: directQuote,
        quoteStatus: "ready",
      }).block,
    ).toBe(false);
  });

  it("detects channel mismatch / shipping context", () => {
    expect(isQuoteBoundToChannel(directQuote, "shared_pallet")).toBe(false);
    expect(isQuoteBoundToChannel(directQuote, "direct_box")).toBe(true);
    expect(
      checkoutHasShippingQuoteContext({
        fulfillmentChannel: "direct_box",
        selectedPalletId: null,
      }),
    ).toBe(true);
    expect(
      checkoutHasShippingQuoteContext({
        fulfillmentChannel: "shared_pallet",
        selectedPalletId: null,
      }),
    ).toBe(false);
  });
});
