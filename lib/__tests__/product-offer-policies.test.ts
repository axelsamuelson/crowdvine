import { describe, expect, it } from "vitest";

import {
  PACT_RETURN_POLICY_URL,
  PACT_SE_SHIPPING_RATE_SEK,
  buildPdpMerchantReturnPolicy,
  buildPdpOfferShippingDetails,
} from "@/lib/seo/product-offer-policies";

describe("PDP Offer shipping and return policy", () => {
  it("ships Sweden at the authorized 99 SEK flat fee", () => {
    const shipping = buildPdpOfferShippingDetails();
    expect(shipping["@type"]).toBe("OfferShippingDetails");
    expect(shipping.shippingRate.value).toBe(PACT_SE_SHIPPING_RATE_SEK);
    expect(shipping.shippingRate.value).toBe(99);
    expect(shipping.shippingRate.currency).toBe("SEK");
    expect(shipping.shippingDestination.addressCountry).toBe("SE");
  });

  it("declares a 14-day customer-paid return policy on /villkor", () => {
    const policy = buildPdpMerchantReturnPolicy();
    expect(policy["@type"]).toBe("MerchantReturnPolicy");
    expect(policy.merchantReturnDays).toBe(14);
    expect(policy.applicableCountry).toBe("SE");
    expect(policy.returnFees).toBe(
      "https://schema.org/ReturnFeesCustomerResponsibility",
    );
    expect(policy.url).toBe(PACT_RETURN_POLICY_URL);
  });
});
