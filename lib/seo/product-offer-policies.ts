import { PACT_PUBLIC_ORIGIN } from "@/lib/i18n/localized-routes";

/**
 * Shared B2C MerchantReturnPolicy for Product Offer JSON-LD (pactwines.com).
 *
 * Confirmed against published purchase terms version 2026-11-13
 * (`content/legal/source/kopvillkor.sv.md` / `kopvillkor.en.md` §8–§10):
 * - §9: 14-day right of withdrawal from the day after delivery
 * - §8–§9: Customer pays actual return shipping (no mark-up) — no fixed amount
 * - §9: Full refund including original standard delivery cost
 * - applicableCountry / returnPolicyCountry SE (Sweden delivery market)
 *
 * Google Merchant requires `returnShippingFeesAmount` when `returnFees` is
 * `ReturnShippingFees`. We have no fixed fee, so we use
 * `ReturnFeesCustomerResponsibility` (same as production today).
 *
 * Do not attach this to Dirty Wine (B2B) pages — those are not covered by
 * the consumer withdrawal window described here.
 */
export const PACT_B2C_MERCHANT_RETURN_POLICY = {
  "@type": "MerchantReturnPolicy",
  applicableCountry: "SE",
  returnPolicyCountry: "SE",
  returnPolicyCategory:
    "https://schema.org/MerchantReturnFiniteReturnWindow",
  merchantReturnDays: 14,
  returnMethod: "https://schema.org/ReturnByMail",
  returnFees: "https://schema.org/ReturnFeesCustomerResponsibility",
  refundType: "https://schema.org/FullRefund",
} as const;

/** Public terms URL used as merchantReturnLink on B2C Offers. */
export const PACT_B2C_MERCHANT_RETURN_LINK =
  `${PACT_PUBLIC_ORIGIN}/villkor` as const;

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
 *
 * deliveryTime stays omitted: terms use working days, schema.org DAY is calendar
 * days — converting 5–10 working days would invent a calendar range.
 */
export function productOfferCommerceFields(options?: {
  termsUrl?: string;
  /**
   * When false, omit the B2C hasMerchantReturnPolicy (Dirty Wine / B2B).
   * Defaults to true for pactwines.com Offer markup.
   */
  includeReturnPolicy?: boolean;
  /**
   * When true, attach terms-backed direct-delivery rate (149 SEK / box of 6).
   * When false (shared pallet / PreOrder), omit rate and deliveryTime.
   */
  directDelivery?: boolean;
}) {
  const termsUrl = options?.termsUrl ?? PACT_B2C_MERCHANT_RETURN_LINK;
  const includeReturnPolicy = options?.includeReturnPolicy ?? true;
  const directDelivery = options?.directDelivery ?? false;

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
        eligibleRegion: "SE",
      }
    : {
        "@type": "OfferShippingDetails" as const,
        shippingDestination: {
          "@type": "DefinedRegion" as const,
          addressCountry: "SE",
        },
        eligibleRegion: "SE",
      };

  return {
    shippingDetails,
    ...(includeReturnPolicy
      ? {
          hasMerchantReturnPolicy: {
            ...PACT_B2C_MERCHANT_RETURN_POLICY,
            merchantReturnLink: termsUrl,
            url: termsUrl,
          },
        }
      : {}),
  } as const;
}
