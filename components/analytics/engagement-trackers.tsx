"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";

const SCROLL_THRESHOLDS = [25, 50, 75, 100] as const;

/**
 * Fires scroll_depth (25/50/75/100 once each per page view) and time_on_page
 * on unmount / visibility hidden / pagehide. Visible seconds only (pauses
 * while the tab is hidden). Mount on PDP and /how-it-works.
 *
 * visitor_id + pact_internal_device tagging come from AnalyticsTracker.
 */
export function EngagementTrackers() {
  const pathname = usePathname() || "/";
  const firedDepths = useRef(new Set<number>());
  const accumulatedMs = useRef(0);
  const visibleSinceMs = useRef<number | null>(null);
  const timeSent = useRef(false);

  useEffect(() => {
    firedDepths.current = new Set();
    accumulatedMs.current = 0;
    timeSent.current = false;
    visibleSinceMs.current =
      typeof performance !== "undefined" ? performance.now() : Date.now();

    const now = () =>
      typeof performance !== "undefined" ? performance.now() : Date.now();

    const pauseVisibleClock = () => {
      if (visibleSinceMs.current == null) return;
      accumulatedMs.current += now() - visibleSinceMs.current;
      visibleSinceMs.current = null;
    };

    const resumeVisibleClock = () => {
      if (visibleSinceMs.current != null) return;
      visibleSinceMs.current = now();
    };

    const visibleSeconds = () => {
      let total = accumulatedMs.current;
      if (visibleSinceMs.current != null) {
        total += now() - visibleSinceMs.current;
      }
      return Math.max(0, Math.round(total / 1000));
    };

    const sendTimeOnPage = () => {
      if (timeSent.current) return;
      timeSent.current = true;
      pauseVisibleClock();
      void AnalyticsTracker.trackEvent({
        eventType: "time_on_page",
        eventCategory: "engagement",
        metadata: {
          seconds: visibleSeconds(),
          path: pathname,
        },
        // Survive navigation / tab close — normal supabase-js fetch is aborted.
        keepalive: true,
      });
    };

    const onScroll = () => {
      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop;
      const scrollable = doc.scrollHeight - window.innerHeight;
      const pct =
        scrollable <= 0
          ? 100
          : Math.min(100, Math.round((scrollTop / scrollable) * 100));

      for (const depth of SCROLL_THRESHOLDS) {
        if (pct >= depth && !firedDepths.current.has(depth)) {
          firedDepths.current.add(depth);
          void AnalyticsTracker.trackEvent({
            eventType: "scroll_depth",
            eventCategory: "engagement",
            metadata: { depth, path: pathname },
          });
        }
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        pauseVisibleClock();
        sendTimeOnPage();
      } else {
        resumeVisibleClock();
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", sendTimeOnPage);
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", sendTimeOnPage);
      sendTimeOnPage();
    };
  }, [pathname]);

  return null;
}
