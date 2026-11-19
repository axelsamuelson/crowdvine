"use client";

import { Suspense } from "react";
import { AnalyticsPageShell } from "../v2/analytics-page-shell";
import { SimpleFetchPanel } from "../v2/simple-fetch-panel";
import { formatSvNumber, MARKET_LABELS } from "@/lib/analytics/v2/labels";

type MarketsData = {
  status: {
    beforeFilter: number;
    afterFilter: number;
    prerenderSuspect: number;
    lastRefreshAt: string | null;
    warnings?: string[];
  };
  rows: Array<{
    market: string;
    sessions: number;
    engaged: number;
    plp: number;
    pdp: number;
    cart: number;
    checkout: number;
  }>;
};

export default function MarknaderPage() {
  return (
    <AnalyticsPageShell
      title="Marknader"
      subtitle="Kommer trafiken från Sverige, och vad gör utländska besök?"
    >
      <Suspense fallback={<div className="admin-skel h-32 rounded-xl" />}>
        <SimpleFetchPanel<MarketsData> endpoint="/api/admin/analytics/v2/markets">
          {(data) => (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white p-4 dark:border-[#1F1F23] dark:bg-[#0F0F12]">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="text-xs font-medium text-gray-600">
                    <th className="py-2">Marknad</th>
                    <th className="py-2">Sessioner</th>
                    <th className="py-2">Engagerade</th>
                    <th className="py-2">PLP</th>
                    <th className="py-2">PDP</th>
                    <th className="py-2">Varukorg</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr
                      key={r.market}
                      className="border-t border-gray-100 tabular-nums dark:border-zinc-800"
                    >
                      <td className="py-2">
                        {MARKET_LABELS[r.market] ||
                          (r.market === "SE" ? "Sverige" : r.market)}
                      </td>
                      <td className="py-2">{formatSvNumber(r.sessions)}</td>
                      <td className="py-2">{formatSvNumber(r.engaged)}</td>
                      <td className="py-2">{formatSvNumber(r.plp)}</td>
                      <td className="py-2">{formatSvNumber(r.pdp)}</td>
                      <td className="py-2">{formatSvNumber(r.cart)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-gray-500">
                PACT säljer bara till Sverige. Utländska besök är främst
                intressanta för SEO och bottfilter.
              </p>
            </div>
          )}
        </SimpleFetchPanel>
      </Suspense>
    </AnalyticsPageShell>
  );
}
