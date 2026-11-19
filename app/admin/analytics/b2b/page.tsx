"use client";

import { Suspense } from "react";
import { AnalyticsPageShell } from "../v2/analytics-page-shell";
import { B2bFunnelPanel } from "../components/b2b-funnel-panel";

/**
 * B2B Dirty Wine moved unchanged to its own page (etapp 1).
 * Swedish chrome; panel content translated where visible.
 */
export default function B2bAnalyticsPage() {
  return (
    <AnalyticsPageShell
      title="B2B Dirty Wine"
      subtitle="Följ B2B-tratten för Dirty Wine (oförändrad logik, egen undersida)."
    >
      <Suspense fallback={<div className="admin-skel h-40 rounded-xl" />}>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-[#1F1F23] dark:bg-[#0F0F12]">
          <B2bFunnelPanel site="dirtywine" />
        </div>
      </Suspense>
    </AnalyticsPageShell>
  );
}
