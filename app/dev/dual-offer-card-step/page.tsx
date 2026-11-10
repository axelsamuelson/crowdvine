import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { isDualOfferCheckoutSurfaceAllowed } from "@/lib/checkout/dual-offer-surface-gate";
import { DualOfferCardStepReview } from "./card-step-review";

export const metadata: Metadata = {
  title: "Dual-offer card step review (preview)",
  robots: { index: false, follow: false },
};

/**
 * Design-review only: mirrors checkout binding layout —
 * continue (non-binding) → Payment Element → binding Köp CTA.
 */
export default function DualOfferCardStepDevPage() {
  if (!isDualOfferCheckoutSurfaceAllowed()) {
    notFound();
  }

  return (
    <main
      className="mx-auto max-w-lg px-4 pb-16 pt-top-spacing font-sans text-foreground"
      data-testid="dual-offer-card-step-dev"
    >
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Loading…</p>
        }
      >
        <DualOfferCardStepReview />
      </Suspense>
    </main>
  );
}
