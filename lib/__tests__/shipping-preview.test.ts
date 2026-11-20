import { describe, expect, it } from "vitest";
import {
  buildShippingPreview,
  resolveDisplayShippingSek,
} from "@/lib/checkout/shipping-preview";
import type { CustomerShippingRateRow } from "@/lib/customer-shipping-pricing";

const PACT_SE_99: CustomerShippingRateRow = {
  id: "pact-se",
  channel: "pact",
  countryCode: "SE",
  flatFeeCents: 9900,
  freeShipping: false,
  freeShippingThresholdCents: null,
  minBottles: null,
  maxBottles: null,
  active: true,
  validFrom: null,
  validTo: null,
};

const DIRECT_SE_149: CustomerShippingRateRow = {
  id: "direct-se",
  channel: "direct_box",
  countryCode: "SE",
  flatFeeCents: 14900,
  freeShipping: false,
  freeShippingThresholdCents: null,
  minBottles: null,
  maxBottles: null,
  active: true,
  validFrom: null,
  validTo: null,
};

describe("buildShippingPreview", () => {
  it("returns configured SE shared 99 and direct 149 from rate rows", () => {
    const preview = buildShippingPreview({
      countryCode: "SE",
      bottleCount: 6,
      productSubtotalSek: 1032,
      rates: [PACT_SE_99, DIRECT_SE_149],
      directBoxEnabled: true,
    });
    expect(preview.shared_pallet).toMatchObject({
      shipping_sek: 99,
      complete: true,
      rate_channel: "pact",
    });
    expect(preview.direct_box).toMatchObject({
      shipping_sek: 149,
      complete: true,
      rate_channel: "direct_box",
    });
  });

  it("omits direct_box when flag is off", () => {
    const preview = buildShippingPreview({
      countryCode: "SE",
      bottleCount: 6,
      rates: [PACT_SE_99, DIRECT_SE_149],
      directBoxEnabled: false,
    });
    expect(preview.shared_pallet?.shipping_sek).toBe(99);
    expect(preview.direct_box).toBeNull();
  });

  it("does not invent shared rate for unknown country", () => {
    const preview = buildShippingPreview({
      countryCode: "US",
      bottleCount: 6,
      rates: [PACT_SE_99],
      directBoxEnabled: false,
    });
    expect(preview.shared_pallet).toBeNull();
  });
});

describe("resolveDisplayShippingSek", () => {
  it("prefers quote when ready, else preview", () => {
    expect(
      resolveDisplayShippingSek({
        fulfillmentChannel: "shared_pallet",
        quoteShippingSek: 99,
        quoteReady: true,
        previewSharedSek: 50,
        previewDirectSek: 149,
      }),
    ).toBe(99);
    expect(
      resolveDisplayShippingSek({
        fulfillmentChannel: "direct_box",
        quoteShippingSek: null,
        quoteReady: false,
        previewSharedSek: 99,
        previewDirectSek: 149,
      }),
    ).toBe(149);
  });
});
