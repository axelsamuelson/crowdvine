"use client";

import { ExitDiscountCartBlock } from "@/components/cart/exit-discount-cart-block";
import { Button } from "@/components/ui/button";

/**
 * Cart-drawer chrome for design-review screenshots of the inline exit-discount
 * block (same placement as production: above the checkout CTA).
 */
export function ExitDiscountCartDesignReview() {
  return (
    <div className="min-h-screen bg-foreground/30 p-0 md:p-6">
      <div
        data-design-review-cart-drawer=""
        className="ml-auto flex h-[100dvh] w-full flex-col rounded bg-muted py-3 md:h-[min(900px,100dvh)] md:w-[500px] md:py-4"
      >
        <div className="mb-6 flex items-center justify-between px-3 md:px-4">
          <span className="text-sm text-muted-foreground">Tillbaka</span>
          <p className="text-2xl font-semibold">Varukorg</p>
          <span className="text-sm text-muted-foreground">Stäng</span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 md:px-4">
          <div className="mb-2 flex justify-between text-sm text-muted-foreground">
            <span>Produkter</span>
            <span>1 vara</span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="mb-3 rounded-md border border-border bg-background p-3">
              <p className="text-sm font-medium text-foreground">
                A Love Supreme 2024
              </p>
              <p className="text-xs text-muted-foreground">6 flaskor · 1 194 kr</p>
            </div>
          </div>

          <div className="max-h-[60%] shrink-0 overflow-y-auto overscroll-contain border-t border-border pt-3">
            <div className="mb-2 flex justify-between text-sm text-foreground/50">
              <p>Frakt</p>
              <p>Beräknas i kassan</p>
            </div>
            <div className="mb-3 flex justify-between text-lg font-semibold">
              <p>Totalt</p>
              <p>1 194 kr</p>
            </div>

            <ExitDiscountCartBlock />

            <Button type="button" className="mt-1 min-h-11 w-full" disabled>
              Till kassan
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
