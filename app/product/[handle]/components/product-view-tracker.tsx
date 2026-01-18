"use client";

import { useEffect } from "react";
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";
import { Product } from "@/lib/shopify/types";

interface ProductViewTrackerProps {
  product: Product;
}

type LastViewedProduct = {
  id: string;
  handle: string;
  title: string;
  producerName?: string;
  color?: string;
  imageUrl?: string;
  price?: string;
  currencyCode?: string;
  viewedAt: number;
};

const STORAGE_KEY = "cv_last_viewed_products_v1";
const MAX_ITEMS = 8;

function getWineColorName(product: Product): string | undefined {
  const options: any[] = Array.isArray((product as any).options)
    ? ((product as any).options as any[])
    : [];

  const colorOption = options.find(
    (opt) => String(opt?.name || "").toLowerCase() === "color",
  );

  if (colorOption && Array.isArray(colorOption.values) && colorOption.values[0]) {
    const firstValue: unknown = colorOption.values[0] as unknown;
    if (typeof firstValue === "string") return firstValue;
    if (
      firstValue &&
      typeof firstValue === "object" &&
      typeof (firstValue as any).name === "string"
    ) {
      return (firstValue as any).name as string;
    }
  }

  const tags: string[] = Array.isArray((product as any).tags)
    ? ((product as any).tags as string[])
    : [];

  const colorTags = [
    "Red",
    "White",
    "Rosé",
    "Orange",
    "Rött",
    "Vitt",
    "Rosévin",
  ];

  const tag = tags.find((t) =>
    colorTags.some((c) => t.toLowerCase().includes(c.toLowerCase())),
  );

  return tag;
}

function storeLastViewed(product: Product) {
  try {
    if (typeof window === "undefined") return;

    const item: LastViewedProduct = {
      id: product.id,
      handle: product.handle,
      title: product.title,
      producerName: (product as any).producerName || (product as any).vendor,
      color: getWineColorName(product),
      imageUrl: product.featuredImage?.url,
      price: (product as any).priceRange?.minVariantPrice?.amount,
      currencyCode: (product as any).priceRange?.minVariantPrice?.currencyCode,
      viewedAt: Date.now(),
    };

    const raw = window.localStorage.getItem(STORAGE_KEY);
    const existing: LastViewedProduct[] = raw ? JSON.parse(raw) : [];

    const next = [
      item,
      ...(Array.isArray(existing) ? existing.filter((p) => p?.id !== item.id) : []),
    ].slice(0, MAX_ITEMS);

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("cv:last_viewed_updated"));
  } catch {
    // ignore
  }
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
        productType: product.productType,
      },
    });

    storeLastViewed(product);
  }, [product.id, product.title, product.handle, product.productType]);

  return null;
}
