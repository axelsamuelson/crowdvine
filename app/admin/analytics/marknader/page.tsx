"use client";

import { Suspense } from "react";
import { AnalyticsPageShell } from "../v2/analytics-page-shell";
import { SimpleFetchPanel } from "../v2/simple-fetch-panel";
import { formatSvNumber, MARKET_LABELS } from "@/lib/analytics/v2/labels";
import { lowNLevel } from "@/lib/analytics/v2/wilson";
import { AlertTriangle } from "lucide-react";
import {
  ScrollTable,
  stickyFirstTd,
  stickyFirstTh,
} from "../v2/scroll-table";

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
    purchases: number;
  }>;
};

function marketLabel(m: string) {
  return MARKET_LABELS[m] || (m === "SE" ? "Sverige" : m);
}

export default function MarknaderPage() {
  return (
    <AnalyticsPageShell
      title="Marknader"
      subtitle="Kommer trafiken från Sverige, och vad gör utländska besök?"
    >
      <Suspense fallback={<div className="admin-skel h-32 rounded-xl" />}>
        <SimpleFetchPanel<MarketsData> endpoint="/api/admin/analytics/v2/markets">
          {(data) => (
            <div className="space-y-3">
              <div className="space-y-3 sm:hidden">
                {data.rows.map((r) => (
                  <div
                    key={r.market}
                    className="rounded-xl border border-gray-200 p-4 dark:border-[#1F1F23]"
                  >
                    <div className="font-medium">{marketLabel(r.market)}</div>
                    <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs tabular-nums text-gray-600 dark:text-gray-400">
                      <div>Besök · {formatSvNumber(r.sessions)}</div>
                      <div>Engagerade · {formatSvNumber(r.engaged)}</div>
                      <div>Lista · {formatSvNumber(r.plp)}</div>
                      <div>Produkt · {formatSvNumber(r.pdp)}</div>
                      <div>Varukorg · {formatSvNumber(r.cart)}</div>
                      <div>Kassa · {formatSvNumber(r.checkout)}</div>
                      <div>Köp · {formatSvNumber(r.purchases)}</div>
                    </dl>
                  </div>
                ))}
              </div>
              <div className="hidden sm:block">
                <ScrollTable minWidth="720px">
                  <thead>
                    <tr className="text-xs font-medium text-gray-600">
                      <th className={`${stickyFirstTh} pl-4`}>Marknad</th>
                      <th className="py-2">Besök</th>
                      <th className="py-2">Engagerade</th>
                      <th className="py-2">Lista</th>
                      <th className="py-2">Produkt</th>
                      <th className="py-2">Varukorg</th>
                      <th className="py-2">Kassa</th>
                      <th className="py-2 pr-4">Köp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((r) => {
                      const level = lowNLevel(r.sessions);
                      return (
                        <tr
                          key={r.market}
                          className="border-t border-gray-100 tabular-nums dark:border-zinc-800"
                        >
                          <td className={`${stickyFirstTd} pl-4`}>
                            {marketLabel(r.market)}
                          </td>
                          <td className="py-2">
                            {formatSvNumber(r.sessions)}
                            {level === "caution" ? (
                              <AlertTriangle className="ml-1 inline h-3 w-3 text-amber-600" />
                            ) : null}
                            {level === "hide" ? (
                              <span className="ml-1 text-[10px] text-amber-700">
                                för få
                              </span>
                            ) : null}
                          </td>
                          <td className="py-2">{formatSvNumber(r.engaged)}</td>
                          <td className="py-2">{formatSvNumber(r.plp)}</td>
                          <td className="py-2">{formatSvNumber(r.pdp)}</td>
                          <td className="py-2">{formatSvNumber(r.cart)}</td>
                          <td className="py-2">{formatSvNumber(r.checkout)}</td>
                          <td className="py-2 pr-4">
                            {formatSvNumber(r.purchases)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </ScrollTable>
              </div>
              <p className="text-xs text-gray-500">
                PACT säljer bara till Sverige. Utländska besök är främst
                intressanta för synlighet och bottfilter.
              </p>
            </div>
          )}
        </SimpleFetchPanel>
      </Suspense>
    </AnalyticsPageShell>
  );
}
