import { describe, expect, it } from "vitest";
import type { CheckoutQuote } from "@/lib/checkout/checkout-quote";
import {
  resolveChannelDisplaySubtotalSek,
  resolveChannelDisplayTotalSek,
  resolveCheckoutPricingChannel,
  selectChannelBoundQuote,
  shouldShowDirectBoxLinePrices,
} from "@/lib/checkout/channel-display-totals";
import {
  directBoxLineTotalSek,
  directBoxUnitPriceSek,
} from "@/lib/commerce/direct-box-pricing";

const sharedQuote: CheckoutQuote = {
  subtotal_sek: 2976,
  shipping_sek: 99,
  promo_discount_sek: 0,
  voucher_discount_sek: 0,
  pact_points_sek: 0,
  pact_points_redeem: 0,
  total_sek: 3075,
  total_ore: 307500,
  shipping_pending: false,
  fulfillment_channel: "shared_pallet",
  rate_channel: "pact",
};

const directQuote: CheckoutQuote = {
  subtotal_sek: 3126,
  shipping_sek: 149,
  promo_discount_sek: 0,
  voucher_discount_sek: 0,
  pact_points_sek: 0,
  pact_points_redeem: 0,
  total_sek: 3275,
  total_ore: 327500,
  shipping_pending: false,
  fulfillment_channel: "direct_box",
  rate_channel: "direct_box",
};

describe("resolveCheckoutPricingChannel (pre-postal pallpris)", () => {
  it("before postal always paints shared/pallet prices (Camille 183→174)", () => {
    expect(
      resolveCheckoutPricingChannel({
        fulfillmentChannel: "direct_box",
        hasPostalCode: false,
      }),
    ).toBe("shared_pallet");
    expect(
      shouldShowDirectBoxLinePrices({
        fulfillmentChannel: "direct_box",
        hasPostalCode: false,
      }),
    ).toBe(false);
    const catalog = 174;
    expect(directBoxUnitPriceSek(catalog, 5)).toBe(183);
    expect(
      resolveChannelDisplaySubtotalSek({
        channel: resolveCheckoutPricingChannel({
          fulfillmentChannel: "direct_box",
          hasPostalCode: false,
        }),
        boundQuote: null,
        sharedClientSubtotalSek: catalog * 6,
        directClientSubtotalSek: directBoxLineTotalSek(catalog, 6, 5),
      }),
    ).toBe(1044);
  });

  it("after postal + Delad → pallpris; after postal + Direkt → +5%", () => {
    expect(
      resolveCheckoutPricingChannel({
        fulfillmentChannel: "shared_pallet",
        hasPostalCode: true,
      }),
    ).toBe("shared_pallet");
    expect(
      shouldShowDirectBoxLinePrices({
        fulfillmentChannel: "shared_pallet",
        hasPostalCode: true,
      }),
    ).toBe(false);
    expect(
      resolveCheckoutPricingChannel({
        fulfillmentChannel: "direct_box",
        hasPostalCode: true,
      }),
    ).toBe("direct_box");
    expect(
      shouldShowDirectBoxLinePrices({
        fulfillmentChannel: "direct_box",
        hasPostalCode: true,
      }),
    ).toBe(true);
  });
});

describe("channel-display-totals (Camille Direktleverans mismatch)", () => {
  it("ignores shared-pallet quote while viewing direct_box", () => {
    expect(selectChannelBoundQuote(sharedQuote, "direct_box")).toBeNull();
    expect(selectChannelBoundQuote(sharedQuote, "shared_pallet")).toBe(
      sharedQuote,
    );
    expect(selectChannelBoundQuote(directQuote, "direct_box")).toBe(directQuote);
  });

  it("uses markup client subtotal when shared quote would otherwise leak", () => {
    const catalogUnit = 496;
    const qty = 6;
    const directClient = directBoxLineTotalSek(catalogUnit, qty, 5);
    expect(directBoxUnitPriceSek(catalogUnit, 5)).toBe(521);
    expect(directClient).toBe(3126);

    const sub = resolveChannelDisplaySubtotalSek({
      channel: "direct_box",
      boundQuote: selectChannelBoundQuote(sharedQuote, "direct_box"),
      sharedClientSubtotalSek: 2976,
      directClientSubtotalSek: directClient,
    });
    expect(sub).toBe(3126);

    const total = resolveChannelDisplayTotalSek({
      boundQuote: null,
      subtotalSek: sub,
      shippingSek: 149,
    });
    expect(total).toBe(3275);
  });

  it("returns null total (skeleton) when shipping for channel is unknown", () => {
    expect(
      resolveChannelDisplayTotalSek({
        boundQuote: null,
        subtotalSek: 3126,
        shippingSek: null,
      }),
    ).toBeNull();
  });

  it("prefers bound quote total when channel matches", () => {
    expect(
      resolveChannelDisplayTotalSek({
        boundQuote: directQuote,
        subtotalSek: 9999,
        shippingSek: 1,
      }),
    ).toBe(3275);
  });
});
