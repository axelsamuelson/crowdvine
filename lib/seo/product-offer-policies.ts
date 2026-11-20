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
  returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
  merchantReturnDays: 14,
  returnMethod: "https://schema.org/ReturnByMail",
  returnFees: "https://schema.org/ReturnFeesCustomerResponsibility",
  refundType: "https://schema.org/FullRefund",
} as const;

export type OfferShippingDetailsLd = {
  "@type": "OfferShippingDetails";
  shippingDestination: {
    "@type": "DefinedRegion";
    addressCountry: "SE";
  };
  shippingRate?: {
    "@type": "MonetaryAmount";
    value: string;
    currency: "SEK";
  };
};

function schemaSek(amount: number): string {
  return (Math.round(amount * 100) / 100).toFixed(2);
}

function offerShippingDetails(
  sek: number | null | undefined,
): OfferShippingDetailsLd {
  const details: OfferShippingDetailsLd = {
    "@type": "OfferShippingDetails",
    shippingDestination: {
      "@type": "DefinedRegion",
      addressCountry: "SE",
    },
  };
  if (sek != null && Number.isFinite(sek) && sek > 0) {
    details.shippingRate = {
      "@type": "MonetaryAmount",
      value: schemaSek(sek),
      currency: "SEK",
    };
  }
  return details;
}

/**
 * Shared Offer shipping + return policy for Product JSON-LD.
 *
 * Rates come from the same customer_shipping_rates rows as checkout.
 * A missing amount is omitted — never filled with a constant.
 * deliveryTime stays omitted (terms use working days, not schema.org days).
 */
export function productOfferCommerceFields(options?: {
  termsUrl?: string;
  /**
   * When false, omit the B2C hasMerchantReturnPolicy (Dirty Wine / B2B).
   * Defaults to true for pactwines.com Offer markup.
   */
  includeReturnPolicy?: boolean;
  /**
   * Resolved SEK fees. `pactSek` is the shared-pallet per-order fee.
   * `directBoxSek` is included only when the caller already shows direct delivery.
   */
  shipping?: {
    pactSek?: number | null;
    directBoxSek?: number | null;
  };
}) {
  const termsUrl = options?.termsUrl ?? `${PACT_PUBLIC_ORIGIN}/villkor`;
  const includeReturnPolicy = options?.includeReturnPolicy ?? true;

  const details: OfferShippingDetailsLd[] = [
    offerShippingDetails(options?.shipping?.pactSek),
  ];
  const directBoxSek = options?.shipping?.directBoxSek;
  if (
    directBoxSek != null &&
    Number.isFinite(directBoxSek) &&
    directBoxSek > 0
  ) {
    details.push(offerShippingDetails(directBoxSek));
  }
  const shippingDetails = details.length === 1 ? details[0] : details;

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
  };
}
