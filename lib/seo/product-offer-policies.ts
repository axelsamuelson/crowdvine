/**
 * Shipping + return facts for PDP Offer JSON-LD (Google product rich results).
 * Shipping rate matches the authorized PACT Sweden flat fee (99 SEK inkl. moms).
 * Return window matches /villkor (14-day ångerrätt; customer pays return shipping).
 */

export const PACT_RETURN_POLICY_URL = "https://pactwines.com/villkor";

/** Authorized SE consumer shipping: 99 SEK inkl. moms per order. */
export const PACT_SE_SHIPPING_RATE_SEK = 99;

export function buildPdpOfferShippingDetails() {
  return {
    "@type": "OfferShippingDetails",
    shippingRate: {
      "@type": "MonetaryAmount",
      value: PACT_SE_SHIPPING_RATE_SEK,
      currency: "SEK",
    },
    shippingDestination: {
      "@type": "DefinedRegion",
      addressCountry: "SE",
    },
  } as const;
}

export function buildPdpMerchantReturnPolicy() {
  return {
    "@type": "MerchantReturnPolicy",
    applicableCountry: "SE",
    returnPolicyCategory:
      "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: 14,
    returnMethod: "https://schema.org/ReturnByMail",
    returnFees: "https://schema.org/ReturnFeesCustomerResponsibility",
    url: PACT_RETURN_POLICY_URL,
  } as const;
}
