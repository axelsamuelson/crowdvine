import { describe, expect, it } from "vitest";

import {
  PACT_SE_SHIPPING_PRICE,
  productOfferCommerceFields,
} from "@/lib/seo/product-offer-policies";

describe("productOfferCommerceFields", () => {
  it("adds shippingDetails and hasMerchantReturnPolicy for Sweden", () => {
    const fields = productOfferCommerceFields();
    expect(fields.shippingDetails["@type"]).toBe("OfferShippingDetails");
    expect(fields.shippingDetails.shippingRate.value).toBe(
      PACT_SE_SHIPPING_PRICE,
    );
    expect(fields.shippingDetails.shippingDestination.addressCountry).toBe(
      "SE",
    );
    expect(fields.hasMerchantReturnPolicy["@type"]).toBe(
      "MerchantReturnPolicy",
    );
    expect(fields.hasMerchantReturnPolicy.merchantReturnDays).toBe(14);
    expect(fields.hasMerchantReturnPolicy.url).toContain("/villkor");
  });
});
