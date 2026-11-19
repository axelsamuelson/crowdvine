"use client";

import { Suspense, useState } from "react";
import { AnalyticsPageShell } from "../v2/analytics-page-shell";
import { SimpleFetchPanel } from "../v2/simple-fetch-panel";
import { formatSvNumber } from "@/lib/analytics/v2/labels";

type ProductsData = {
  status: {
    beforeFilter: number;
    afterFilter: number;
    prerenderSuspect: number;
    lastRefreshAt: string | null;
    warnings?: string[];
  };
  wines: Array<{
    product_id: string;
    product_name: string | null;
    list_sessions: number;
    pdp_sessions: number;
    cart_sessions: number;
    checkout_sessions: number;
    purchase_sessions: number;
  }>;
  lists: Array<{ path: string; sessions: number }>;
};

export default function ProdukterPage() {
  const [tab, setTab] = useState<"lists" | "wines">("wines");
  return (
    <AnalyticsPageShell
      title="Produkter"
      subtitle="Vilka listor och viner drar intresse, och var tappar produktsidan?"
    >
      <div className="flex gap-2">
        <button
          type="button"
          className={
            tab === "wines"
              ? "rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white dark:bg-white dark:text-gray-900"
              : "rounded-md border border-gray-200 px-3 py-1.5 text-sm dark:border-[#1F1F23]"
          }
          onClick={() => setTab("wines")}
        >
          Viner
        </button>
        <button
          type="button"
          className={
            tab === "lists"
              ? "rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white dark:bg-white dark:text-gray-900"
              : "rounded-md border border-gray-200 px-3 py-1.5 text-sm dark:border-[#1F1F23]"
          }
          onClick={() => setTab("lists")}
        >
          Listor
        </button>
      </div>
      <Suspense fallback={<div className="admin-skel h-32 rounded-xl" />}>
        <SimpleFetchPanel<ProductsData> endpoint="/api/admin/analytics/v2/products">
          {(data) =>
            tab === "wines" ? (
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white p-4 dark:border-[#1F1F23] dark:bg-[#0F0F12]">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="text-xs font-medium text-gray-600">
                      <th className="py-2">Vin</th>
                      <th className="py-2">PDP</th>
                      <th className="py-2">Varukorg</th>
                      <th className="py-2">Kassa</th>
                      <th className="py-2">Köp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.wines.map((w) => (
                      <tr
                        key={w.product_id}
                        className="border-t border-gray-100 tabular-nums dark:border-zinc-800"
                      >
                        <td className="py-2">
                          {w.product_name || w.product_id}
                        </td>
                        <td className="py-2">{formatSvNumber(w.pdp_sessions)}</td>
                        <td className="py-2">{formatSvNumber(w.cart_sessions)}</td>
                        <td className="py-2">
                          {formatSvNumber(w.checkout_sessions)}
                        </td>
                        <td className="py-2">
                          {formatSvNumber(w.purchase_sessions)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.wines.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-500">
                    Inga produktvyer i perioden.
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white p-4 dark:border-[#1F1F23] dark:bg-[#0F0F12]">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs font-medium text-gray-600">
                      <th className="py-2">Sida</th>
                      <th className="py-2">Sessioner med PLP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lists.map((l) => (
                      <tr
                        key={l.path}
                        className="border-t border-gray-100 tabular-nums dark:border-zinc-800"
                      >
                        <td className="py-2 font-mono text-xs">{l.path}</td>
                        <td className="py-2">{formatSvNumber(l.sessions)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </SimpleFetchPanel>
      </Suspense>
    </AnalyticsPageShell>
  );
}
