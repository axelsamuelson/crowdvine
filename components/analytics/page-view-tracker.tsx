"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";
import { waitForTrackableDocument } from "@/lib/analytics/should-track-page-view";

/**
 * Site-wide traffic base layer. Fires page_view on mount and pathname changes,
 * skipping consecutive duplicates of the same path.
 *
 * E4: do not call ensureVisitorIdentity() here — trackEvent already does.
 * Only emit when the document is visible and not prerendering.
 */
export function PageViewTracker() {
  const pathname = usePathname();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    if (lastPathRef.current === pathname) return;

    let cancelled = false;
    const path = pathname;

    void (async () => {
      const ok = await waitForTrackableDocument();
      if (cancelled || !ok) return;
      // Re-check duplicate after await (fast navigations).
      if (lastPathRef.current === path) return;
      lastPathRef.current = path;

      void AnalyticsTracker.trackEvent({
        eventType: "page_view",
        eventCategory: "navigation",
        metadata: { path },
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
