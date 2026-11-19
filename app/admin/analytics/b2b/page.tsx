"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AnalyticsPageShell } from "../v2/analytics-page-shell";
import { B2bFunnelPanel } from "../components/b2b-funnel-panel";
import { parseAnalyticsV2Filters } from "@/lib/analytics/v2/filters";

/**
 * B2B Dirty Wine — own page (etapp 1). Site locked to Dirty Wine; period from filter bar.
 */
export default function B2bAnalyticsPage() {
  return (
    <AnalyticsPageShell
      title="B2B Dirty Wine"
      subtitle="Följ B2B-tratten för Dirty Wine."
      forceSite="dirtywine"
    >
      <Suspense fallback={<div className="admin-skel h-40 rounded-xl" />}>
        <B2bPeriodBridge />
      </Suspense>
    </AnalyticsPageShell>
  );
}

function B2bPeriodBridge() {
  const searchParams = useSearchParams();
  const filters = parseAnalyticsV2Filters(searchParams);
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-[#1F1F23] dark:bg-[#0F0F12]">
      <B2bFunnelPanel
        site="dirtywine"
        from={filters.from}
        to={filters.to}
      />
    </div>
  );
}
