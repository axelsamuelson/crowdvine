"use client";

import { useCallback, type ReactNode } from "react";
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";
import { VisibleOnceTracker } from "@/components/analytics/visible-once-tracker";

type Props = {
  productId: string;
  productName?: string;
  source: "list" | "product" | "guide";
  listPrice?: number;
  currency?: string;
  children: ReactNode;
  className?: string;
};

export function PriceViewTracker({
  productId,
  productName,
  source,
  listPrice,
  currency,
  children,
  className,
}: Props) {
  const onVisible = useCallback(() => {
    void AnalyticsTracker.trackPriceViewed(productId, {
      productName,
      source,
      list_price: listPrice,
      currency,
    });
  }, [currency, listPrice, productId, productName, source]);

  return (
    <VisibleOnceTracker
      onceKey={`price_viewed:${source}:${productId}`}
      onVisible={onVisible}
      className={className}
    >
      {children}
    </VisibleOnceTracker>
  );
}
