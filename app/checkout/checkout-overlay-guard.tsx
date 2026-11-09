"use client";

import { useEffect } from "react";

/**
 * Preview/deploy overlays (Vercel Live feedback / Toolbar) inject
 * `<vercel-live-feedback id="vercel-live-feedback">` as a mid-right circular FAB
 * (z-index 2147483647) that overlaps dual-offer copy on ~390px.
 *
 * Identified on EN mobile /checkout — not an in-app component (CompleteOrderRail
 * and ExitFeedbackPrompt are already gated off checkout). CSS alone is not
 * enough because Vercel re-injects / restyles; we remove matching nodes and
 * append `?_vercel_toolbar=0` so the session prefers toolbar-off.
 */

const HIDE_CSS = `
vercel-live-feedback,
vercel-live-feedback *,
#vercel-live-feedback,
#vercel-live-feedback-button,
[data-vercel-toolbar],
[data-vercel-live],
[data-vercel-toolbar-root],
[data-vercel-toolbar-container],
[data-vercel-live-feedback],
button[aria-label="Toggle Vercel Toolbar"],
button[aria-label*="Vercel Toolbar"],
button[aria-label*="Vercel"],
a[href*="vercel.com/live"],
a[href*="vercel.live"],
iframe[src*="vercel.live"],
iframe[src*="vercel.com"][src*="live"],
div[id^="vercel-live"],
div[class*="vercel-live"],
div[class*="vercel-toolbar"],
div[data-testid="vercel-live"],
nextjs-portal {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
  opacity: 0 !important;
  width: 0 !important;
  height: 0 !important;
  max-width: 0 !important;
  max-height: 0 !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  clip-path: inset(50%) !important;
  position: fixed !important;
  left: -9999px !important;
  top: -9999px !important;
  z-index: -1 !important;
}
`;

const SELECTOR = [
  "vercel-live-feedback",
  "#vercel-live-feedback",
  "#vercel-live-feedback-button",
  "[data-vercel-toolbar]",
  "[data-vercel-live]",
  "[data-vercel-toolbar-root]",
  "[data-vercel-toolbar-container]",
  "[data-vercel-live-feedback]",
  'button[aria-label="Toggle Vercel Toolbar"]',
  'button[aria-label*="Vercel Toolbar"]',
  'a[href*="vercel.com/live"]',
  'a[href*="vercel.live"]',
  'iframe[src*="vercel.live"]',
  'div[id^="vercel-live"]',
  'div[class*="vercel-live"]',
  'div[class*="vercel-toolbar"]',
  "nextjs-portal",
].join(",");

function stripVercelOverlays() {
  document.querySelectorAll(SELECTOR).forEach((el) => {
    try {
      el.remove();
    } catch {
      if (el instanceof HTMLElement) {
        el.style.setProperty("display", "none", "important");
        el.style.setProperty("visibility", "hidden", "important");
        el.style.setProperty("pointer-events", "none", "important");
        el.style.setProperty("opacity", "0", "important");
      }
    }
  });
}

function preferToolbarOff() {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get("_vercel_toolbar") === "0") return;
    url.searchParams.set("_vercel_toolbar", "0");
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  } catch {
    // ignore
  }
}

export function CheckoutOverlayGuard() {
  useEffect(() => {
    preferToolbarOff();
    stripVercelOverlays();

    const observer = new MutationObserver(() => {
      stripVercelOverlays();
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    const timers = [200, 500, 1000, 2000, 4000].map((ms) =>
      window.setTimeout(stripVercelOverlays, ms),
    );

    return () => {
      observer.disconnect();
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: HIDE_CSS,
      }}
    />
  );
}
