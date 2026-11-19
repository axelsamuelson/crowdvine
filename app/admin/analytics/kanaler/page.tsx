"use client";

import { Suspense } from "react";
import { AnalyticsPageShell } from "../v2/analytics-page-shell";
import { SimpleFetchPanel } from "../v2/simple-fetch-panel";
import { formatSvNumber, labelChannel } from "@/lib/analytics/v2/labels";
import { lowNLevel } from "@/lib/analytics/v2/wilson";
import { AlertTriangle } from "lucide-react";

type ChannelsData = {
  status: {
    beforeFilter: number;
    afterFilter: number;
    prerenderSuspect: number;
    lastRefreshAt: string | null;
    warnings?: string[];
  };
  rows: Array<{
    channel: string;
    sessions: number;
    engaged: number;
    plp: number;
    pdp: number;
    cart: number;
    checkout: number;
    purchases: number;
  }>;
  notice: string;
};

export default function KanalerPage() {
  return (
    <AnalyticsPageShell
      title="Kanaler"
      subtitle="Vilka källor ger besök som går vidare till produkt och varukorg?"
    >
      <Suspense fallback={<div className="admin-skel h-32 rounded-xl" />}>
        <SimpleFetchPanel<ChannelsData> endpoint="/api/admin/analytics/v2/channels">
          {(data) => (
            <div className="space-y-4">
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-100">
                {data.notice}
              </div>
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white p-4 dark:border-[#1F1F23] dark:bg-[#0F0F12]">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="text-xs font-medium text-gray-600">
                      <th className="py-2">Kanal</th>
                      <th className="py-2">Sessioner</th>
                      <th className="py-2">Engagerade</th>
                      <th className="py-2">PLP</th>
                      <th className="py-2">PDP</th>
                      <th className="py-2">Varukorg</th>
                      <th className="py-2">Kassa</th>
                      <th className="py-2">Köp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((r) => {
                      const level = lowNLevel(r.sessions);
                      return (
                        <tr
                          key={r.channel}
                          className="border-t border-gray-100 tabular-nums dark:border-zinc-800"
                        >
                          <td className="py-2">{labelChannel(r.channel)}</td>
                          <td className="py-2">
                            {formatSvNumber(r.sessions)}
                            {level === "caution" ? (
                              <AlertTriangle className="ml-1 inline h-3 w-3 text-amber-600" />
                            ) : null}
                          </td>
                          <td className="py-2">{formatSvNumber(r.engaged)}</td>
                          <td className="py-2">{formatSvNumber(r.plp)}</td>
                          <td className="py-2">{formatSvNumber(r.pdp)}</td>
                          <td className="py-2">{formatSvNumber(r.cart)}</td>
                          <td className="py-2">{formatSvNumber(r.checkout)}</td>
                          <td className="py-2">{formatSvNumber(r.purchases)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </SimpleFetchPanel>
      </Suspense>
    </AnalyticsPageShell>
  );
}
