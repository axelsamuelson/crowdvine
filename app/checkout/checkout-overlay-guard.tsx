"use client";

/**
 * Preview/deploy overlays (Vercel Live feedback, toolbar) sit mid-right as a
 * round FAB and overlap dual-offer on ~390px. Hide them on checkout only.
 */
export function CheckoutOverlayGuard() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
[data-vercel-toolbar],
[data-vercel-live],
vercel-live-feedback,
#vercel-live-feedback,
#vercel-live-feedback-button,
button[aria-label="Toggle Vercel Toolbar"] {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
}
`,
      }}
    />
  );
}
