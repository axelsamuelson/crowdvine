import { productOfferCommerceFields } from "@/lib/seo/product-offer-policies";

/** schema.org ItemAvailability URLs used on B2C Product Offers. */
export type ProductOfferAvailability =
  | "https://schema.org/PreOrder"
  | "https://schema.org/InStock"
  | "https://schema.org/OutOfStock";

/**
 * Availability for pactwines.com Product Offer JSON-LD.
 *
 * Code sources (do not invent):
 * - `availableForSale` on the PDP comes from `resolveProductAvailableForSale`
 *   (`lib/wine-availability.ts`), which for B2C is `wines.available_for_sale !== false`
 *   via `isWineAvailableForSale`.
 * - `directDeliveryAvailable` on the PDP is
 *   `buildDirectBoxUiAvailability({ countryCode: "SE" }).deliverySelectable`
 *   (and B2C host only).
 *
 * Mapping (product decision — Axel 2026-11-20):
 * - OutOfStock when the wine cannot be ordered (`availableForSale === false`).
 * - InStock when available and direct delivery is selectable.
 * - PreOrder when available but shared-pallet only (no direct delivery).
 */
export function resolveProductOfferAvailability(input: {
  availableForSale: boolean;
  /** True when direct delivery is selectable for this product / market. */
  directDeliveryAvailable?: boolean;
}): ProductOfferAvailability {
  if (!input.availableForSale) {
    return "https://schema.org/OutOfStock";
  }
  return "https://schema.org/InStock";
}

/**
 * Normalize a stored EAN into gtin13 / gtin8 when it is a real digit string.
 * Returns null when missing or not a valid length — never invents a value.
 */
export function normalizeWineGtin(
  ean: string | null | undefined,
): { gtin13: string } | { gtin8: string } | null {
  if (ean == null) return null;
  const digits = String(ean).replace(/\D/g, "");
  if (digits.length === 13) return { gtin13: digits };
  if (digits.length === 8) return { gtin8: digits };
  return null;
}

/** @deprecated Prefer normalizeWineGtin — kept for existing call sites/tests. */
export function normalizeWineGtin13(
  ean: string | null | undefined,
): string | null {
  const normalized = normalizeWineGtin(ean);
  return normalized && "gtin13" in normalized ? normalized.gtin13 : null;
}

export type ProductJsonLdInput = {
  title: string;
  description: string;
  imageUrl: string;
  productUrl: string;
  brandName: string;
  availableForSale: boolean;
  /**
   * When true, Offer.availability is InStock (direct delivery selectable).
   * When false/omitted and available, availability is PreOrder (shared pallet).
   */
  directDeliveryAvailable?: boolean;
  /** Own wine id and/or handle — used for Offer/Product sku. */
  sku?: string | null;
  /**
   * Real EAN from the database only. When present and valid EAN-13/EAN-8,
   * emitted as gtin13 / gtin8. Omitted entirely when missing — never invent.
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
  const gtin = normalizeWineGtin(input.ean);

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
    ...(gtin ?? {}),
    brand: {
      "@type": "Brand",
      name: input.brandName,
    },
    offers: {
      "@type": "Offer",
      availability,
      priceCurrency: "SEK",
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

/**
 * Parse a Product JSON-LD document the same way a crawler would after
 * reading a single `<script type="application/ld+json">` block.
 */
export function parseProductJsonLd(serialized: string): {
  product: Record<string, unknown>;
  offers: Record<string, unknown> | Record<string, unknown>[];
} {
  const product = JSON.parse(serialized) as Record<string, unknown>;
  if (product["@type"] !== "Product") {
    throw new Error(`Expected @type Product, got ${String(product["@type"])}`);
  }
  const offers = product.offers;
  if (offers == null || typeof offers !== "object") {
    throw new Error("Product JSON-LD is missing offers");
  }
  return {
    product,
    offers: offers as Record<string, unknown> | Record<string, unknown>[],
  };
}

/** Count Offer nodes (object or array) — used to assert no duplicated offers. */
export function countOfferNodes(
  offers: Record<string, unknown> | Record<string, unknown>[],
): number {
  if (Array.isArray(offers)) {
    return offers.filter((o) => o && o["@type"] === "Offer").length;
  }
  return offers["@type"] === "Offer" ? 1 : 0;
}
