"use client";

import dynamic from "next/dynamic";

/**
 * Non-critical analytics / CRO widgets. Loaded client-only so they never join
 * the root layout's initial hydration long-task (react-dom chunk).
 */
const PageViewTracker = dynamic(
  () =>
    import("@/components/analytics/page-view-tracker").then(
      (m) => m.PageViewTracker,
    ),
  { ssr: false },
);

const SessionEngagementTracker = dynamic(
  () =>
    import("@/components/analytics/session-engagement-tracker").then(
      (m) => m.SessionEngagementTracker,
    ),
  { ssr: false },
);

const InternalDeviceMarker = dynamic(
  () =>
    import("@/components/analytics/internal-device-marker").then(
      (m) => m.InternalDeviceMarker,
    ),
  { ssr: false },
);

const ExitFeedbackPrompt = dynamic(
  () =>
    import("@/components/analytics/exit-feedback-prompt").then(
      (m) => m.ExitFeedbackPrompt,
    ),
  { ssr: false },
);

const Analytics = dynamic(
  () => import("@vercel/analytics/react").then((m) => m.Analytics),
  { ssr: false },
);

const Toaster = dynamic(() => import("sonner").then((m) => m.Toaster), {
  ssr: false,
});

/**
 * @param isB2B — dirtywine.se / B2B hosts must not mount the exit popup
 * (shared root layout previously loaded it on both portals).
 */
export function RootAnalyticsDeferred({
  isB2B = false,
}: {
  isB2B?: boolean;
}) {
  return (
    <>
      <Toaster closeButton position="bottom-right" />
      <InternalDeviceMarker />
      <PageViewTracker />
      <SessionEngagementTracker />
      {!isB2B ? <ExitFeedbackPrompt /> : null}
      <Analytics />
    </>
  );
}
