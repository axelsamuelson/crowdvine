import { productOfferCommerceFields } from "@/lib/seo/product-offer-policies";

/** schema.org ItemAvailability URLs used on B2C Product Offers. */
export type ProductOfferAvailability =
  | "https://schema.org/PreOrder"
  | "https://schema.org/InStock"
  | "https://schema.org/OutOfStock";

/**
 * Availability for pactwines.com Product Offer JSON-LD.
 *
 * - OutOfStock when the wine is not available for sale (sold out / not listed).
 * - InStock only when direct delivery can fulfill now (flag/logic says so).
 * - PreOrder for the default shared-pallet model (delivery after the pallet closes).
 */
export function resolveProductOfferAvailability(input: {
  availableForSale: boolean;
  /** True when direct delivery (immediate fulfilment) is offered for this product. */
  directDeliveryAvailable?: boolean;
}): ProductOfferAvailability {
  if (!input.availableForSale) {
    return "https://schema.org/OutOfStock";
  }
  if (input.directDeliveryAvailable) {
    return "https://schema.org/InStock";
  }
  return "https://schema.org/PreOrder";
}

/**
 * Normalize a stored EAN into gtin13 when it is a real 13-digit value.
 * Returns null when missing or not a valid EAN-13 — never invents a value.
 */
export function normalizeWineGtin13(
  ean: string | null | undefined,
): string | null {
  if (ean == null) return null;
  const digits = String(ean).replace(/\D/g, "");
  if (digits.length !== 13) return null;
  return digits;
}

export type ProductJsonLdInput = {
  title: string;
  description: string;
  imageUrl: string;
  productUrl: string;
  brandName: string;
  availableForSale: boolean;
  /**
   * When true, Offer.availability is InStock (direct delivery now).
   * When false/omitted and available, availability is PreOrder (shared pallet).
   */
  directDeliveryAvailable?: boolean;
  /** Own wine id and/or handle — used for Offer/Product sku. */
  sku?: string | null;
  /**
   * Real EAN from the database only. When present and valid EAN-13, emitted as
   * gtin13. Omitted entirely when missing — never invent.
   */
  ean?: string | null;
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
  const availability = resolveProductOfferAvailability({
    availableForSale: input.availableForSale,
    directDeliveryAvailable: input.directDeliveryAvailable,
  });

  const sku =
    typeof input.sku === "string" && input.sku.trim().length > 0
      ? input.sku.trim()
      : undefined;
  const gtin13 = normalizeWineGtin13(input.ean) ?? undefined;

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
    ...(sku ? { sku } : {}),
    ...(gtin13 ? { gtin13 } : {}),
    brand: {
      "@type": "Brand",
      name: input.brandName,
    },
    offers: {
      "@type": "Offer",
      availability,
      priceCurrency: input.priceCurrency,
      price: input.price,
      url: input.productUrl,
      ...(sku ? { sku } : {}),
      seller: {
        "@type": "Organization",
        name: input.sellerName,
        sameAs: ["https://www.instagram.com/pactwines"],
      },
      ...productOfferCommerceFields({
        includeReturnPolicy: input.includeB2cReturnPolicy,
        directDelivery: Boolean(input.directDeliveryAvailable),
      }),
    },
    ...(additionalProperty && additionalProperty.length > 0
      ? { additionalProperty }
      : {}),
  };
}
