import { describe, expect, it } from "vitest";

import { buildProductPdpJsonLd } from "@/lib/seo/product-json-ld";
import {
  PACT_B2C_MERCHANT_RETURN_POLICY,
  PACT_SE_SHIPPING_PRICE,
  productOfferCommerceFields,
} from "@/lib/seo/product-offer-policies";

describe("PACT_B2C_MERCHANT_RETURN_POLICY", () => {
  it("is the shared 14-day-from-delivery B2C return policy for SE", () => {
    expect(PACT_B2C_MERCHANT_RETURN_POLICY).toEqual({
      "@type": "MerchantReturnPolicy",
      applicableCountry: "SE",
      returnPolicyCategory:
        "https://schema.org/MerchantReturnFiniteReturnWindow",
      merchantReturnDays: 14,
      returnMethod: "https://schema.org/ReturnByMail",
      returnFees: "https://schema.org/ReturnFeesCustomerResponsibility",
    });
  });
});

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
    expect(fields.hasMerchantReturnPolicy).toMatchObject(
      PACT_B2C_MERCHANT_RETURN_POLICY,
    );
    expect(fields.hasMerchantReturnPolicy.url).toBe(
      "https://pactwines.com/villkor",
    );
  });

  it("omits hasMerchantReturnPolicy when includeReturnPolicy is false", () => {
    const fields = productOfferCommerceFields({ includeReturnPolicy: false });
    expect(fields.shippingDetails["@type"]).toBe("OfferShippingDetails");
    expect(fields).not.toHaveProperty("hasMerchantReturnPolicy");
  });
});

describe("buildProductPdpJsonLd", () => {
  const baseInput = {
    title: "L 2023",
    description: "Naturvin från Languedoc",
    imageUrl: "https://pactwines.com/pact-og-uploaded.jpg",
    productUrl: "https://pactwines.com/produkt/l-2023",
    brandName: "Test Producer",
    availableForSale: true,
    priceCurrency: "SEK",
    price: "174",
    sellerName: "PACT",
    wineEnrichment: null,
  };

  it("embeds the shared B2C MerchantReturnPolicy in Offer JSON-LD", () => {
    const jsonLd = buildProductPdpJsonLd({
      ...baseInput,
      includeB2cReturnPolicy: true,
    });
    const serialized = JSON.stringify(jsonLd);

    expect(jsonLd["@type"]).toBe("Product");
    expect(jsonLd.offers["@type"]).toBe("Offer");
    expect(jsonLd.offers.hasMerchantReturnPolicy).toMatchObject(
      PACT_B2C_MERCHANT_RETURN_POLICY,
    );
    expect(jsonLd.offers.hasMerchantReturnPolicy.url).toBe(
      "https://pactwines.com/villkor",
    );
    expect(serialized).toContain("MerchantReturnFiniteReturnWindow");
    expect(serialized).toContain('"merchantReturnDays":14');
    expect(serialized).not.toContain("PreOrder");
    expect(serialized).not.toContain('"sku"');
    expect(serialized).not.toContain("gtin");
  });

  it("does not attach the B2C return policy on Dirty Wine (B2B) JSON-LD", () => {
    const jsonLd = buildProductPdpJsonLd({
      ...baseInput,
      sellerName: "Dirty Wine",
      includeB2cReturnPolicy: false,
    });
    const serialized = JSON.stringify(jsonLd);

    expect(jsonLd.offers["@type"]).toBe("Offer");
    expect(jsonLd.offers).not.toHaveProperty("hasMerchantReturnPolicy");
    expect(serialized).not.toContain("hasMerchantReturnPolicy");
    expect(serialized).not.toContain("MerchantReturnFiniteReturnWindow");
    expect(jsonLd.offers.shippingDetails["@type"]).toBe("OfferShippingDetails");
  });
});
