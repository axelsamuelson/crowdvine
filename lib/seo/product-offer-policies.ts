import { PACT_PUBLIC_ORIGIN } from "@/lib/i18n/localized-routes";

/** Authorized PACT Sweden flat shipping: 99 SEK incl. VAT per order. */
export const PACT_SE_SHIPPING_PRICE = "99.00";
export const PACT_SE_SHIPPING_CURRENCY = "SEK";

/**
 * Shared B2C MerchantReturnPolicy for Product Offer JSON-LD (pactwines.com).
 * merchantReturnDays is counted from delivery (not order/purchase date).
 * Do not attach this to Dirty Wine (B2B) pages — those are not covered by
 * the consumer withdrawal window described here.
 */
export const PACT_B2C_MERCHANT_RETURN_POLICY = {
  "@type": "MerchantReturnPolicy",
  applicableCountry: "SE",
  returnPolicyCategory:
    "https://schema.org/MerchantReturnFiniteReturnWindow",
  merchantReturnDays: 14,
  returnMethod: "https://schema.org/ReturnByMail",
  returnFees: "https://schema.org/ReturnFeesCustomerResponsibility",
} as const;

/**
 * Shared Offer shipping + return policy for Product JSON-LD.
 * Shipping matches checkout (99 SEK/order). Return policy is
 * {@link PACT_B2C_MERCHANT_RETURN_POLICY} (14 days from delivery).
 */
export function productOfferCommerceFields(options?: {
  termsUrl?: string;
  /**
   * When false, omit the B2C hasMerchantReturnPolicy (Dirty Wine / B2B).
   * Defaults to true for pactwines.com Offer markup.
   */
  includeReturnPolicy?: boolean;
}) {
  const termsUrl = options?.termsUrl ?? `${PACT_PUBLIC_ORIGIN}/villkor`;
  const includeReturnPolicy = options?.includeReturnPolicy ?? true;

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
    ...(includeReturnPolicy
      ? {
          hasMerchantReturnPolicy: {
            ...PACT_B2C_MERCHANT_RETURN_POLICY,
            url: termsUrl,
          },
        }
      : {}),
  } as const;
}
