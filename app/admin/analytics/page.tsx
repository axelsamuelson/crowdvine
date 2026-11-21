import { Suspense } from "react";
import { AnalyticsPageShell } from "./v2/analytics-page-shell";
import { OverviewPanel } from "./v2/overview-panel";

export const dynamic = "force-dynamic";

export default function AnalyticsOverviewPage() {
  return (
    <AnalyticsPageShell
      title="Översikt"
      subtitle="Hur går köpvärde och trafik den här perioden, och är datan att lita på?"
    >
      <Suspense
        fallback={
          <div className="admin-skel h-40 w-full rounded-xl" aria-hidden />
        }
      >
        <OverviewPanel />
      </Suspense>
    </AnalyticsPageShell>
  );
}
