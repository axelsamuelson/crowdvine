"use client";

import { useCallback, type ReactNode } from "react";
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";
import { VisibleOnceTracker } from "@/components/analytics/visible-once-tracker";

function deviceBucket(): "mobile" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  return window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop";
}

type Props = {
  productId: string;
  children: ReactNode;
  className?: string;
};

/**
 * Fires `cta_visible` once per page view when the PDP primary CTA
 * ("Lägg i varukorg") enters the viewport.
 */
export function CtaVisibleTracker({ productId, children, className }: Props) {
  const onVisible = useCallback(() => {
    void AnalyticsTracker.trackEvent({
      eventType: "cta_visible",
      eventCategory: "engagement",
      metadata: {
        product_id: productId,
        device: deviceBucket(),
      },
    });
  }, [productId]);

  return (
    <VisibleOnceTracker
      onceKey={`cta_visible:product:${productId}`}
      onVisible={onVisible}
      className={className}
      threshold={0.4}
    >
      {children}
    </VisibleOnceTracker>
  );
}
