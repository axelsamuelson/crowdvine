"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";

/**
 * Site-wide traffic base layer. Fires page_view on mount and pathname changes,
 * skipping consecutive duplicates of the same path.
 */
export function PageViewTracker() {
  const pathname = usePathname();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;

    void AnalyticsTracker.trackEvent({
      eventType: "page_view",
      eventCategory: "navigation",
      metadata: { path: pathname },
    });
  }, [pathname]);

  return null;
}
