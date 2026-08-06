import type { ExpectedAmountComponents } from "@/lib/checkout/expected-amount";

/** Authoritative checkout money breakdown (major units in charge currency). */
export type CheckoutQuote = {
  subtotal_sek: number;
  shipping_sek: number;
  promo_discount_sek: number;
  voucher_discount_sek: number;
  pact_points_sek: number;
  pact_points_redeem: number;
  total_sek: number;
  total_ore: number;
};

export function buildCheckoutQuote(args: {
  components: ExpectedAmountComponents;
  amountOre: number;
  pactPointsRedeem: number;
}): CheckoutQuote {
  const { components, amountOre, pactPointsRedeem } = args;
  return {
    subtotal_sek: components.subtotal,
    shipping_sek: components.shippingSek,
    promo_discount_sek: components.promoSek,
    voucher_discount_sek: components.voucherSek,
    pact_points_sek: components.pactPointsSek,
    pact_points_redeem: Math.max(0, Math.floor(pactPointsRedeem)),
    total_sek: components.finalMajor,
    total_ore: amountOre,
  };
}
