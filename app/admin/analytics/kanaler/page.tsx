"use client";

import { Suspense, useState } from "react";
import { AnalyticsPageShell } from "../v2/analytics-page-shell";
import { SimpleFetchPanel } from "../v2/simple-fetch-panel";
import { formatSvNumber, labelChannel } from "@/lib/analytics/v2/labels";
import { lowNLevel } from "@/lib/analytics/v2/wilson";
import { AlertTriangle } from "lucide-react";
import {
  ScrollTable,
  stickyFirstTd,
  stickyFirstTh,
} from "../v2/scroll-table";
import { KanaltestPanel } from "./kanaltest-panel";

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

type Tab = "kanaler" | "kanaltest";

export default function KanalerPage() {
  const [tab, setTab] = useState<Tab>("kanaler");

  return (
    <AnalyticsPageShell
      title="Kanaler"
      subtitle="Vilka källor ger besök som går vidare till produkt och varukorg?"
    >
      <div className="mb-4 flex gap-2 border-b border-gray-200 dark:border-[#1F1F23]">
        {(
          [
            ["kanaler", "Kanaler"],
            ["kanaltest", "Kanaltest"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={
              tab === id
                ? "border-b-2 border-gray-900 px-3 py-2 text-sm font-medium text-gray-900 dark:border-white dark:text-white"
                : "px-3 py-2 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            }
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "kanaltest" ? (
        <KanaltestPanel />
      ) : (
        <Suspense fallback={<div className="admin-skel h-32 rounded-xl" />}>
          <SimpleFetchPanel<ChannelsData> endpoint="/api/admin/analytics/v2/channels">
            {(data) => (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {data.notice}
                </p>
                {/* Mobile cards */}
                <div className="space-y-3 sm:hidden">
                  {data.rows.map((r) => (
                    <div
                      key={r.channel}
                      className="rounded-xl border border-gray-200 p-4 dark:border-[#1F1F23]"
                    >
                      <div className="font-medium">{labelChannel(r.channel)}</div>
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
                        <th className={`${stickyFirstTh} pl-4`}>Kanal</th>
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
                            key={r.channel}
                            className="border-t border-gray-100 tabular-nums dark:border-zinc-800"
                          >
                            <td className={`${stickyFirstTd} pl-4`}>
                              {labelChannel(r.channel)}
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
              </div>
            )}
          </SimpleFetchPanel>
        </Suspense>
      )}
    </AnalyticsPageShell>
  );
}
