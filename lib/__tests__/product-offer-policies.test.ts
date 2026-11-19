import { describe, expect, it } from "vitest";

import {
  buildProductPdpJsonLd,
  normalizeWineGtin13,
  resolveProductOfferAvailability,
} from "@/lib/seo/product-json-ld";
import {
  PACT_B2C_MERCHANT_RETURN_POLICY,
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
      refundType: "https://schema.org/FullRefund",
    });
  });
});

describe("productOfferCommerceFields", () => {
  it("adds SE shippingDestination and hasMerchantReturnPolicy for shared pallet", () => {
    const fields = productOfferCommerceFields();
    const details = fields.shippingDetails;
    expect(Array.isArray(details)).toBe(false);
    if (Array.isArray(details)) return;
    expect(details["@type"]).toBe("OfferShippingDetails");
    expect(details.shippingDestination.addressCountry).toBe("SE");
    expect(details).not.toHaveProperty("shippingRate");
    expect(details).not.toHaveProperty("deliveryTime");
    expect(fields.hasMerchantReturnPolicy).toMatchObject(
      PACT_B2C_MERCHANT_RETURN_POLICY,
    );
    expect(fields.hasMerchantReturnPolicy.url).toBe(
      "https://pactwines.com/villkor",
    );
  });

  it("adds the resolved pact rate and a second direct-box rate when both are passed", () => {
    const fields = productOfferCommerceFields({
      shipping: { pactSek: 99, directBoxSek: 149 },
    });
    expect(Array.isArray(fields.shippingDetails)).toBe(true);
    if (!Array.isArray(fields.shippingDetails)) return;
    expect(fields.shippingDetails).toHaveLength(2);
    expect(fields.shippingDetails[0]?.shippingRate).toEqual({
      "@type": "MonetaryAmount",
      value: "99.00",
      currency: "SEK",
    });
    expect(fields.shippingDetails[1]?.shippingRate).toEqual({
      "@type": "MonetaryAmount",
      value: "149.00",
      currency: "SEK",
    });
    expect(fields.shippingDetails[0]).not.toHaveProperty("deliveryTime");
  });

  it("omits a rate when the lookup did not return an amount", () => {
    const fields = productOfferCommerceFields({
      shipping: { pactSek: null, directBoxSek: null },
    });
    expect(Array.isArray(fields.shippingDetails)).toBe(false);
    if (Array.isArray(fields.shippingDetails)) return;
    expect(fields.shippingDetails).not.toHaveProperty("shippingRate");
  });

  it("omits hasMerchantReturnPolicy when includeReturnPolicy is false", () => {
    const fields = productOfferCommerceFields({ includeReturnPolicy: false });
    const details = fields.shippingDetails;
    expect(Array.isArray(details)).toBe(false);
    if (Array.isArray(details)) return;
    expect(details["@type"]).toBe("OfferShippingDetails");
    expect(fields).not.toHaveProperty("hasMerchantReturnPolicy");
  });
});

describe("resolveProductOfferAvailability", () => {
  it("uses PreOrder for shared-pallet wines available for sale", () => {
    expect(resolveProductOfferAvailability({ availableForSale: true })).toBe(
      "https://schema.org/PreOrder",
    );
    expect(
      resolveProductOfferAvailability({
        availableForSale: true,
        directDeliveryAvailable: false,
      }),
    ).toBe("https://schema.org/PreOrder");
  });

  it("uses InStock only when direct delivery can fulfill now", () => {
    expect(
      resolveProductOfferAvailability({
        availableForSale: true,
        directDeliveryAvailable: true,
      }),
    ).toBe("https://schema.org/InStock");
  });

  it("uses OutOfStock when the wine is sold out", () => {
    expect(resolveProductOfferAvailability({ availableForSale: false })).toBe(
      "https://schema.org/OutOfStock",
    );
    expect(
      resolveProductOfferAvailability({
        availableForSale: false,
        directDeliveryAvailable: true,
      }),
    ).toBe("https://schema.org/OutOfStock");
  });
});

describe("normalizeWineGtin13", () => {
  it("returns null when EAN is missing or inventable garbage", () => {
    expect(normalizeWineGtin13(null)).toBeNull();
    expect(normalizeWineGtin13(undefined)).toBeNull();
    expect(normalizeWineGtin13("")).toBeNull();
    expect(normalizeWineGtin13("123")).toBeNull();
    expect(normalizeWineGtin13("not-an-ean")).toBeNull();
  });

  it("accepts a real 13-digit EAN", () => {
    expect(normalizeWineGtin13("4006381333931")).toBe("4006381333931");
    expect(normalizeWineGtin13("4006 3813 3393 1")).toBe("4006381333931");
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
    sku: "l-2023",
    priceCurrency: "SEK",
    price: "174",
    sellerName: "PACT",
    wineEnrichment: null,
  };

  it("uses PreOrder for shared-pallet availability and includes sku", () => {
    const jsonLd = buildProductPdpJsonLd({
      ...baseInput,
      includeB2cReturnPolicy: true,
    });

    expect(jsonLd.offers.availability).toBe("https://schema.org/PreOrder");
    expect(jsonLd.sku).toBe("l-2023");
    expect(jsonLd.offers.sku).toBe("l-2023");
    expect(jsonLd).not.toHaveProperty("gtin13");
    expect(jsonLd).not.toHaveProperty("gtin");
  });

  it("uses InStock when direct delivery is available", () => {
    const jsonLd = buildProductPdpJsonLd({
      ...baseInput,
      directDeliveryAvailable: true,
      includeB2cReturnPolicy: true,
    });

    expect(jsonLd.offers.availability).toBe("https://schema.org/InStock");
    const details = jsonLd.offers.shippingDetails;
    const first = Array.isArray(details) ? details[0] : details;
    expect(first).not.toHaveProperty("shippingRate");
  });

  it("emits pact shipping and direct-box shipping only when that rate is passed", () => {
    const both = buildProductPdpJsonLd({
      ...baseInput,
      directDeliveryAvailable: true,
      includeB2cReturnPolicy: true,
      shippingSek: { pact: 99, directBox: 149 },
    });
    expect(Array.isArray(both.offers.shippingDetails)).toBe(true);
    if (!Array.isArray(both.offers.shippingDetails)) return;
    expect(
      both.offers.shippingDetails.map((d) => d.shippingRate?.value),
    ).toEqual(["99.00", "149.00"]);

    const pactOnly = buildProductPdpJsonLd({
      ...baseInput,
      includeB2cReturnPolicy: true,
      shippingSek: { pact: 99, directBox: null },
    });
    const details = pactOnly.offers.shippingDetails;
    expect(Array.isArray(details)).toBe(false);
    if (Array.isArray(details)) return;
    expect(details.shippingRate?.value).toBe("99.00");
  });

  it("uses OutOfStock when sold out", () => {
    const jsonLd = buildProductPdpJsonLd({
      ...baseInput,
      availableForSale: false,
      includeB2cReturnPolicy: true,
    });

    expect(jsonLd.offers.availability).toBe("https://schema.org/OutOfStock");
  });

  it("omits gtin when there is no EAN", () => {
    const jsonLd = buildProductPdpJsonLd({
      ...baseInput,
      ean: null,
      includeB2cReturnPolicy: true,
    });
    const serialized = JSON.stringify(jsonLd);

    expect(jsonLd).not.toHaveProperty("gtin13");
    expect(jsonLd).not.toHaveProperty("gtin");
    expect(serialized).not.toContain("gtin");
  });

  it("emits gtin13 only when a real EAN-13 is provided", () => {
    const jsonLd = buildProductPdpJsonLd({
      ...baseInput,
      ean: "4006381333931",
      includeB2cReturnPolicy: true,
    });

    expect(jsonLd.gtin13).toBe("4006381333931");
  });

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
    expect(jsonLd.offers.hasMerchantReturnPolicy.applicableCountry).toBe("SE");
    expect(jsonLd.offers.hasMerchantReturnPolicy.merchantReturnDays).toBe(14);
    expect(jsonLd.offers.hasMerchantReturnPolicy.returnFees).toBe(
      "https://schema.org/ReturnFeesCustomerResponsibility",
    );
    expect(serialized).toContain("MerchantReturnFiniteReturnWindow");
    expect(serialized).toContain('"merchantReturnDays":14');
    expect(serialized).toContain("PreOrder");
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
    const details = jsonLd.offers.shippingDetails;
    expect(Array.isArray(details)).toBe(false);
    if (Array.isArray(details)) return;
    expect(details["@type"]).toBe("OfferShippingDetails");
  });

  it("passes a schema.org structure check for a typical shared-pallet PDP", () => {
    const jsonLd = buildProductPdpJsonLd({
      ...baseInput,
      includeB2cReturnPolicy: true,
    });

    // Structural rules aligned with schema.org Product + Offer expectations
    // used by Google merchant rich results (required/recommended fields).
    expect(jsonLd["@context"]).toBe("https://schema.org");
    expect(jsonLd["@type"]).toBe("Product");
    expect(typeof jsonLd.name).toBe("string");
    expect(jsonLd.name.length).toBeGreaterThan(0);
    expect(typeof jsonLd.image).toBe("string");
    expect(jsonLd.image.startsWith("http")).toBe(true);
    expect(jsonLd.brand["@type"]).toBe("Brand");
    expect(jsonLd.offers["@type"]).toBe("Offer");
    expect(jsonLd.offers.priceCurrency).toBe("SEK");
    expect(String(jsonLd.offers.price)).toMatch(/^\d+(\.\d+)?$/);
    expect(jsonLd.offers.availability).toMatch(
      /^https:\/\/schema\.org\/(PreOrder|InStock|OutOfStock)$/,
    );
    expect(jsonLd.offers.url).toMatch(/^https:\/\//);
    expect(jsonLd.offers.hasMerchantReturnPolicy["@type"]).toBe(
      "MerchantReturnPolicy",
    );
    const details = jsonLd.offers.shippingDetails;
    const first = Array.isArray(details) ? details[0] : details;
    expect(first?.["@type"]).toBe("OfferShippingDetails");
    expect(first?.shippingDestination.addressCountry).toBe("SE");
    // No invented identifiers
    expect(jsonLd).not.toHaveProperty("gtin");
    expect(jsonLd).not.toHaveProperty("gtin13");
  });
});
