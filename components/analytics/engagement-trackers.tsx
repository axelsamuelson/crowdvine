"use client";

import { useEffect, useRef } from "react";
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";

const SCROLL_THRESHOLDS = [25, 50, 75, 100] as const;

type Props = {
  page: string;
};

/**
 * Fires scroll_depth (25/50/75/100 once each) and time_on_page on unmount /
 * visibility hidden. Mount on PDP and /how-it-works.
 */
export function EngagementTrackers({ page }: Props) {
  const firedDepths = useRef(new Set<number>());
  const startMs = useRef(
    typeof performance !== "undefined" ? performance.now() : Date.now(),
  );
  const timeSent = useRef(false);

  useEffect(() => {
    firedDepths.current = new Set();
    timeSent.current = false;
    startMs.current =
      typeof performance !== "undefined" ? performance.now() : Date.now();

    const sendTimeOnPage = () => {
      if (timeSent.current) return;
      timeSent.current = true;
      const elapsed =
        ((typeof performance !== "undefined" ? performance.now() : Date.now()) -
          startMs.current) /
        1000;
      void AnalyticsTracker.trackEvent({
        eventType: "time_on_page",
        eventCategory: "engagement",
        metadata: {
          seconds: Math.max(0, Math.round(elapsed)),
          page,
        },
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
            metadata: { depth, page },
          });
        }
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") sendTimeOnPage();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      sendTimeOnPage();
    };
  }, [page]);

  return null;
}
