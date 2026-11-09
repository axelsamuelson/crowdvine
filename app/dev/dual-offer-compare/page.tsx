import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { isDualOfferCheckoutSurfaceAllowed } from "@/lib/checkout/dual-offer-surface-gate";
import {
  buildDualOfferQuoteSet,
  buildOfferQuote,
  buildSyntheticDirectOfferFromShared,
  type OfferLineSnapshot,
} from "@/lib/checkout/offer-quote";
import type { CheckoutQuote } from "@/lib/checkout/checkout-quote";
import { DualOfferReviewLocales } from "./review-locales";

export const metadata: Metadata = {
  title: "Dual-offer checkout review (preview)",
  robots: { index: false, follow: false },
};

/**
 * Inès / independent design review surface.
 * Synthetic fixture — no live Stripe/DB writes.
 * Visible only when CHECKOUT_DUAL_OFFER_COMPARE=true and not production.
 */
export default function DualOfferCompareDevPage() {
  if (!isDualOfferCheckoutSurfaceAllowed()) {
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

  return (
    // Review-only clearance below sticky site chrome. Does not change global header.
    <main
      className="min-h-screen bg-background text-foreground pt-top-spacing"
      data-testid="dual-offer-dev-main"
    >
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-4 font-sans">
        <Suspense fallback={<p className="text-sm text-muted-foreground">…</p>}>
          <DualOfferReviewLocales dual={dual} />
        </Suspense>
        <aside
          className="scroll-mt-top-spacing rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 px-3 py-2 font-mono text-[11px] text-muted-foreground"
          data-testid="dual-offer-page-diagnostics"
        >
          Fixture cart: 8 bottles (mixed 145+160 SEK) · destination SE ·
          weighted avg bottle = wines_subtotal/bottle_count · migration 279
          unapplied · not authenticated /checkout
        </aside>
      </div>
    </main>
  );
}
