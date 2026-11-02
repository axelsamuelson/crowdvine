import { productOfferCommerceFields } from "@/lib/seo/product-offer-policies";

export type ProductJsonLdInput = {
  title: string;
  description: string;
  imageUrl: string;
  productUrl: string;
  brandName: string;
  availableForSale: boolean;
  priceCurrency: string;
  price: string;
  sellerName: string;
  wineEnrichment?: {
    grapeVarieties?: string[] | null;
    appellation?: string | null;
    abv?: string | null;
    farming?: string | null;
  } | null;
  /**
   * When true (pactwines.com B2C), attach PACT_B2C_MERCHANT_RETURN_POLICY.
   * When false (Dirty Wine B2B), omit hasMerchantReturnPolicy.
   */
  includeB2cReturnPolicy: boolean;
};

/**
 * Product JSON-LD for PDP pages. Pure helper so Offer/return-policy output
 * can be unit-tested without rendering the full page.
 */
export function buildProductPdpJsonLd(input: ProductJsonLdInput) {
  const additionalProperty = input.wineEnrichment
    ? [
        input.wineEnrichment.grapeVarieties?.length
          ? {
              "@type": "PropertyValue" as const,
              name: "Grape variety",
              value: input.wineEnrichment.grapeVarieties.join(", "),
            }
          : null,
        input.wineEnrichment.appellation
          ? {
              "@type": "PropertyValue" as const,
              name: "Appellation",
              value: input.wineEnrichment.appellation,
            }
          : null,
        input.wineEnrichment.abv
          ? {
              "@type": "PropertyValue" as const,
              name: "Alcohol",
              value: input.wineEnrichment.abv,
            }
          : null,
        input.wineEnrichment.farming
          ? {
              "@type": "PropertyValue" as const,
              name: "Farming",
              value: input.wineEnrichment.farming,
            }
          : null,
      ].filter(
        (
          item,
        ): item is { "@type": "PropertyValue"; name: string; value: string } =>
          item != null,
      )
    : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.title,
    description: input.description,
    image: input.imageUrl,
    url: input.productUrl,
    brand: {
      "@type": "Brand",
      name: input.brandName,
    },
    offers: {
      "@type": "Offer",
      availability: input.availableForSale
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      priceCurrency: input.priceCurrency,
      price: input.price,
      url: input.productUrl,
      seller: {
        "@type": "Organization",
        name: input.sellerName,
        sameAs: ["https://www.instagram.com/pactwines"],
      },
      ...productOfferCommerceFields({
        includeReturnPolicy: input.includeB2cReturnPolicy,
      }),
    },
    ...(additionalProperty && additionalProperty.length > 0
      ? { additionalProperty }
      : {}),
  };
}
