"use client";

import { useEffect } from "react";
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";
import { Product } from "@/lib/shopify/types";

interface ProductViewTrackerProps {
  product: Product;
}

export function ProductViewTracker({ product }: ProductViewTrackerProps) {
  useEffect(() => {
    AnalyticsTracker.trackEvent({
      eventType: "product_viewed",
      eventCategory: "navigation",
      metadata: { 
        productId: product.id, 
        productName: product.title,
        productHandle: product.handle,
        productType: product.productType
      }
    });
  }, [product.id, product.title, product.handle, product.productType]);

  return null;
}

