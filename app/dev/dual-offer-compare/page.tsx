import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DualOfferComparePreview } from "@/components/checkout/dual-offer-compare-preview";
import {
  buildDualOfferQuoteSet,
  buildOfferQuote,
  buildSyntheticDirectOfferFromShared,
  isDualOfferCompareEnabled,
  type OfferLineSnapshot,
} from "@/lib/checkout/offer-quote";
import type { CheckoutQuote } from "@/lib/checkout/checkout-quote";

export const metadata: Metadata = {
  title: "Dual-offer compare (preview)",
  robots: { index: false, follow: false },
};

/**
 * Synthetic fixture page — no live Stripe/DB writes.
 * Visible only when CHECKOUT_DUAL_OFFER_COMPARE=true and not production.
 */
export default function DualOfferCompareDevPage() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.VERCEL_ENV !== "preview"
  ) {
    notFound();
  }
  if (!isDualOfferCompareEnabled()) {
    notFound();
  }

  const wine_lines: OfferLineSnapshot[] = [
    {
      wine_id: "dddddddd-dddd-dddd-dddd-ddddddddddd1",
      quantity: 6,
      unit_price_sek: 145,
      line_total_sek: 870,
    },
    {
      wine_id: "dddddddd-dddd-dddd-dddd-ddddddddddd2",
      quantity: 2,
      unit_price_sek: 160,
      line_total_sek: 320,
    },
  ];
  const wines_subtotal = 1190;
  const shipping = 99;
  const money: CheckoutQuote = {
    subtotal_sek: wines_subtotal,
    shipping_sek: shipping,
    promo_discount_sek: 0,
    voucher_discount_sek: 0,
    pact_points_sek: 0,
    pact_points_redeem: 0,
    total_sek: wines_subtotal + shipping,
    total_ore: (wines_subtotal + shipping) * 100,
    shipping_pending: false,
    fulfillment_channel: "shared_pallet",
    rate_channel: "pact",
  };
  const shared = buildOfferQuote({
    offer: "shared_pallet",
    money,
    wine_lines,
    destination_country: "SE",
    pricing_source: "synthetic_fixture",
    user_id: "preview-user",
    cart_id: "synthetic-preview-cart",
  });
  const direct = buildSyntheticDirectOfferFromShared({ shared });
  const dual = buildDualOfferQuoteSet({
    cart_id: "synthetic-preview-cart",
    shared_pallet: shared,
    direct_box: direct,
    destination_country: "SE",
  });

  return <DualOfferComparePreview initialDual={dual} locale="sv" />;
}
