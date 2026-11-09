import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isDualOfferCheckoutSurfaceAllowed } from "@/lib/checkout/dual-offer-surface-gate";
import { DualOfferCardStepReview } from "./card-step-review";

export const metadata: Metadata = {
  title: "Dual-offer card step review (preview)",
  robots: { index: false, follow: false },
};

/**
 * Design-review only: Stripe Payment Element (TEST) + incomplete-card error,
 * without a binding buy click. Not shown in production.
 *
 * Prod dual-offer checkout: buy click accepts the quote only; the card step
 * stays hidden while dual-offer review is active (no SetupIntent before buy).
 */
export default function DualOfferCardStepDevPage() {
  if (!isDualOfferCheckoutSurfaceAllowed()) {
    notFound();
  }

  return (
    <main
      className="mx-auto max-w-lg px-4 py-10 pt-top-spacing font-sans text-foreground"
      data-testid="dual-offer-card-step-dev"
    >
      <h1 className="text-xl font-semibold tracking-tight">
        4. Betalning / Payment (review)
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Preview-only Stripe TEST Payment Element. Incomplete card error is shown
        for screenshots. Not wired to checkout buy click.
      </p>
      <div className="mt-6">
        <DualOfferCardStepReview />
      </div>
    </main>
  );
}
