import { PACT_PUBLIC_ORIGIN } from "@/lib/i18n/localized-routes";

/** Authorized PACT Sweden flat shipping: 99 SEK incl. VAT per order. */
export const PACT_SE_SHIPPING_PRICE = "99.00";
export const PACT_SE_SHIPPING_CURRENCY = "SEK";

/**
 * Shared Offer shipping + return policy for Product JSON-LD.
 * Shipping matches checkout (99 SEK/order). Return policy matches /villkor:
 * no right of withdrawal.
 */
export function productOfferCommerceFields(options?: {
  termsUrl?: string;
}) {
  const termsUrl = options?.termsUrl ?? `${PACT_PUBLIC_ORIGIN}/villkor`;

  return {
    shippingDetails: {
      "@type": "OfferShippingDetails",
      shippingRate: {
        "@type": "MonetaryAmount",
        value: PACT_SE_SHIPPING_PRICE,
        currency: PACT_SE_SHIPPING_CURRENCY,
      },
      shippingDestination: {
        "@type": "DefinedRegion",
        addressCountry: "SE",
      },
      deliveryTime: {
        "@type": "ShippingDeliveryTime",
        handlingTime: {
          "@type": "QuantitativeValue",
          minValue: 1,
          maxValue: 14,
          unitCode: "DAY",
        },
        transitTime: {
          "@type": "QuantitativeValue",
          minValue: 1,
          maxValue: 7,
          unitCode: "DAY",
        },
      },
    },
    hasMerchantReturnPolicy: {
      "@type": "MerchantReturnPolicy",
      applicableCountry: "SE",
      returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
      url: termsUrl,
    },
  } as const;
}
