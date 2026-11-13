import { PACT_PUBLIC_ORIGIN } from "@/lib/i18n/localized-routes";

/**
 * Shared B2C MerchantReturnPolicy for Product Offer JSON-LD (pactwines.com).
 *
 * Grounded ONLY in published purchase terms (`content/legal/source/kopvillkor.sv.md`
 * §8–§9 and `kopvillkor.en.md` §8–§9):
 * - 14-day right of withdrawal from the day after delivery
 * - Customer pays actual return shipping (no mark-up)
 * - applicableCountry SE (Sweden delivery market)
 *
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
  refundType: "https://schema.org/FullRefund",
} as const;

/** Direct-delivery shipping rate stated in purchase terms (149 kr / box of 6). */
export const PACT_SE_DIRECT_SHIPPING_PRICE = "149.00";
export const PACT_SE_SHIPPING_CURRENCY = "SEK";

/**
 * Shared Offer shipping + return policy for Product JSON-LD.
 *
 * Shipping fields are included only when clearly stated in the published terms.
 * Shared-pallet shipping amount is not named in the terms, so PreOrder offers
 * get destination SE only (no invented rate or transit window).
 * Direct delivery states 149 kr / box of 6 and normally 5–10 working days.
 */
export function productOfferCommerceFields(options?: {
  termsUrl?: string;
  /**
   * When false, omit the B2C hasMerchantReturnPolicy (Dirty Wine / B2B).
   * Defaults to true for pactwines.com Offer markup.
   */
  includeReturnPolicy?: boolean;
  /**
   * When true, attach terms-backed direct-delivery rate and delivery window.
   * When false (shared pallet / PreOrder), omit rate and deliveryTime.
   */
  directDelivery?: boolean;
}) {
  const termsUrl = options?.termsUrl ?? `${PACT_PUBLIC_ORIGIN}/villkor`;
  const includeReturnPolicy = options?.includeReturnPolicy ?? true;
  const directDelivery = options?.directDelivery ?? false;

  // Terms state "5–10 working days" for direct delivery; schema.org DAY is not
  // the same unit, so deliveryTime is omitted rather than guessed as calendar days.
  const shippingDetails = directDelivery
    ? {
        "@type": "OfferShippingDetails" as const,
        shippingRate: {
          "@type": "MonetaryAmount" as const,
          value: PACT_SE_DIRECT_SHIPPING_PRICE,
          currency: PACT_SE_SHIPPING_CURRENCY,
        },
        shippingDestination: {
          "@type": "DefinedRegion" as const,
          addressCountry: "SE",
        },
      }
    : {
        "@type": "OfferShippingDetails" as const,
        shippingDestination: {
          "@type": "DefinedRegion" as const,
          addressCountry: "SE",
        },
      };

  return {
    shippingDetails,
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
