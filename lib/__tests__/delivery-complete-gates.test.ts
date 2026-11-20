import { describe, expect, it } from "vitest";
import {
  computeDeliveryCompleteForAgeUnlock,
  isCheckoutPurchaseBlockedByQuote,
} from "@/lib/commerce/delivery-complete-gates";
import type { CheckoutQuote } from "@/lib/checkout/checkout-quote";

const base = {
  hasZoneDeliveryReady: true,
  deliveryZoneReady: true,
  hasProducerItems: true,
  selectedPallet: { id: "pal-1" },
  isUsConditional: false,
  hasUsState: true,
  budbeeAvailable: true,
  directBoxDeliverySelectable: true,
};

const readySharedQuote: CheckoutQuote = {
  subtotal_sek: 1200,
  shipping_sek: 99,
  promo_discount_sek: 0,
  voucher_discount_sek: 0,
  pact_points_sek: 0,
  pact_points_redeem: 0,
  total_sek: 1299,
  total_ore: 129900,
  shipping_pending: false,
  fulfillment_channel: "shared_pallet",
  rate_channel: "pact",
};

describe("deliveryComplete age unlock vs quote gate", () => {
  it("unlocks age without a quote when DIRECT_BOX is on (guest deadlock fix)", () => {
    expect(
      computeDeliveryCompleteForAgeUnlock({
        ...base,
        directBoxCheckoutEnabled: true,
        fulfillmentChannel: "shared_pallet",
      }),
    ).toBe(true);

    expect(
      computeDeliveryCompleteForAgeUnlock({
        ...base,
        directBoxCheckoutEnabled: true,
        fulfillmentChannel: "direct_box",
        selectedPallet: null,
      }),
    ).toBe(true);
  });

  it("still requires pallet for shared_pallet producer carts", () => {
    expect(
      computeDeliveryCompleteForAgeUnlock({
        ...base,
        directBoxCheckoutEnabled: true,
        fulfillmentChannel: "shared_pallet",
        selectedPallet: null,
      }),
    ).toBe(false);
  });

  it("blocks purchase on missing/loading quote when DIRECT_BOX is on", () => {
    expect(
      isCheckoutPurchaseBlockedByQuote({
        directBoxCheckoutEnabled: true,
        fulfillmentChannel: "shared_pallet",
        quote: null,
        quoteStatus: "error",
      }),
    ).toBe(true);

    expect(
      isCheckoutPurchaseBlockedByQuote({
        directBoxCheckoutEnabled: true,
        fulfillmentChannel: "shared_pallet",
        quote: readySharedQuote,
        quoteStatus: "ready",
      }),
    ).toBe(false);
  });

  it("does not gate purchase on quote when DIRECT_BOX is off", () => {
    expect(
      isCheckoutPurchaseBlockedByQuote({
        directBoxCheckoutEnabled: false,
        fulfillmentChannel: "shared_pallet",
        quote: null,
        quoteStatus: "idle",
      }),
    ).toBe(false);
  });
});
