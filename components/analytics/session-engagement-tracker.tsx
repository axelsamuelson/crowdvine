"use client";

import { useEffect } from "react";
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";

const VISIBLE_MS = 10_000;

/**
 * Emits session_engaged once per analytics session, on the first of:
 * scroll past 25% of the page, any click, any keydown, or 10s continuously visible.
 */
export function SessionEngagementTracker() {
  useEffect(() => {
    let visibleTimer: number | null = null;
    let sent = false;

    const mark = (
      trigger: "scroll" | "click" | "visible_10s" | "keydown",
    ) => {
      if (sent) return;
      sent = true;
      AnalyticsTracker.trackSessionEngaged(trigger);
      detach();
    };

    const clearVisible = () => {
      if (visibleTimer != null) {
        window.clearTimeout(visibleTimer);
        visibleTimer = null;
      }
    };

    const armVisible = () => {
      if (sent || visibleTimer != null) return;
      if (document.visibilityState !== "visible") return;
      visibleTimer = window.setTimeout(() => {
        visibleTimer = null;
        mark("visible_10s");
      }, VISIBLE_MS);
    };

    const onScroll = () => {
      const scrolling = document.documentElement;
      const max = scrolling.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      if (window.scrollY / max > 0.25) mark("scroll");
    };

    const onClick = () => mark("click");
    const onKeydown = () => mark("keydown");
    const onVisibility = () => {
      if (document.visibilityState === "visible") armVisible();
      else clearVisible();
    };

    function detach() {
      clearVisible();
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKeydown);
      document.removeEventListener("visibilitychange", onVisibility);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeydown);
    document.addEventListener("visibilitychange", onVisibility);
    armVisible();

    return detach;
  }, []);

  return null;
}
