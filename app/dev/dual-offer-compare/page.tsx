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
 *
 * Fixture: 12 bottles from one source (2 boxes) so direct shipping = 2 × 149.
 */
export default function DualOfferCompareDevPage() {
  if (!isDualOfferCheckoutSurfaceAllowed()) {
    notFound();
  }

  const wine_lines: OfferLineSnapshot[] = [
    {
      wine_id: "dddddddd-dddd-dddd-dddd-ddddddddddd1",
      quantity: 12,
      unit_price_sek: 145,
      line_total_sek: 1740,
    },
  ];
  const wines_subtotal = 1740;
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
    charge_deadline_at: new Date(
      Date.now() + 28 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  });
  const direct = buildSyntheticDirectOfferFromShared({ shared });
  const dual = buildDualOfferQuoteSet({
    cart_id: "synthetic-preview-cart",
    shared_pallet: shared,
    direct_box: direct,
    destination_country: "SE",
  });

  return (
    <>
      <div
        aria-hidden
        data-testid="dual-offer-dev-header-shield"
        className="pointer-events-none fixed inset-x-0 top-0 z-40 h-[var(--top-spacing)] bg-background"
      />
      <main
        className="fixed inset-x-0 bottom-0 top-[var(--top-spacing)] z-0 overflow-y-auto overscroll-y-contain bg-background text-foreground"
        data-testid="dual-offer-dev-main"
      >
        <div className="mx-auto max-w-3xl px-4 py-6 space-y-4 font-sans">
          <Suspense fallback={<p className="text-sm text-muted-foreground">…</p>}>
            <DualOfferReviewLocales dual={dual} />
          </Suspense>
        </div>
      </main>
    </>
  );
}
