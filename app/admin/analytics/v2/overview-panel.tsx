"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { analyticsV2ToQueryString, parseAnalyticsV2Filters } from "@/lib/analytics/v2/filters";
import { formatSvNumber, formatSvSek, labelFulfillment } from "@/lib/analytics/v2/labels";
import { DataStatusLine } from "./data-status-line";
import { KpiCard } from "./kpi-card";

type OverviewResponse = {
  status: {
    beforeFilter: number;
    afterFilter: number;
    prerenderSuspect: number;
    lastRefreshAt: string | null;
    warnings: string[];
  };
  current: {
    sessions: number;
    engaged: number;
    plp: number;
    pdp: number;
    plpOrPdp?: number;
    cart: number;
    checkout: number;
    purchases: number;
    purchaseValueSek: number;
  };
  previous: {
    sessions: number;
    plp: number;
    pdp: number;
    plpOrPdp?: number;
    cart: number;
    checkout: number;
    purchases: number;
    purchaseValueSek: number;
  } | null;
  funnel: Array<{ key: string; label: string; count: number }>;
  series: Array<{ day: string; sessions: number; plp: number; pdp: number; purchases: number }>;
  fulfillment: Array<{ channel: string; count: number; valueSek: number }>;
  annotations: Array<{ id: string; date: string; label: string; category: string }>;
  annotationsError: string | null;
  purchaseLinkApproximate: true;
};

export function OverviewPanel() {
  const searchParams = useSearchParams();
  const filters = parseAnalyticsV2Filters(searchParams);
  const qs = analyticsV2ToQueryString(filters);
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch(`/api/admin/analytics/v2/overview?${qs}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Kunde inte hämta översikt");
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Kunde inte hämta översikt");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [qs]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Hämtar översikt …
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
        {error || "Kunde inte hämta översikt. Försök igen."}
      </div>
    );
  }

  const c = data.current;
  const p = data.previous;
  const toPlpPdp = c.plpOrPdp ?? Math.max(c.plp, c.pdp);
  const prevPlpPdp = p
    ? (p.plpOrPdp ?? Math.max(p.plp || 0, p.pdp || 0))
    : null;

  return (
    <div className="space-y-6">
      <DataStatusLine {...data.status} queryString={qs} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Rena besök"
          value={c.sessions}
          compareAbs={p ? c.sessions - p.sessions : null}
          definition="Besök efter bottfilter och utan förhandsladdningar."
        />
        <KpiCard
          label="Besök till lista eller produkt"
          value={toPlpPdp}
          ofTotal={{ num: toPlpPdp, den: Math.max(1, c.sessions) }}
          compareAbs={prevPlpPdp != null ? toPlpPdp - prevPlpPdp : null}
          definition="Rena besök som nådde produktlista eller produktsida."
          emptyLabel="Inga än"
        />
        <KpiCard
          label="Lade i varukorg"
          value={
            c.cart === 0
              ? "Inga än"
              : c.sessions >= 10
                ? `${((c.cart / Math.max(1, c.sessions)) * 100).toFixed(1).replace(".", ",")} %`
                : formatSvNumber(c.cart)
          }
          ofTotal={{ num: c.cart, den: c.sessions }}
          definition="Andel besök där någon lade vin i varukorgen."
          emptyLabel="Inga än"
        />
        <KpiCard
          label="Började i kassan"
          value={c.checkout}
          ofTotal={{ num: c.checkout, den: c.sessions }}
          definition="Besök som öppnade kassan."
          emptyLabel="Inga än"
        />
        <KpiCard
          label="Slutförda köp"
          value={c.purchases}
          definition="Genomförda reservationer (inte testköp)."
          emptyLabel="Inga köp än"
        />
        <KpiCard
          label="Köpvärde"
          value={
            c.purchaseValueSek > 0
              ? formatSvSek(c.purchaseValueSek)
              : "Inga köp än"
          }
          definition="Vin efter rabatt plus frakt."
          emptyLabel="Inga köp än"
        />
        <KpiCard
          label="Kassakonvertering"
          value={
            c.purchases === 0
              ? "Inga köp än"
              : c.checkout >= 10
                ? `${((c.purchases / Math.max(1, c.checkout)) * 100).toFixed(1).replace(".", ",")} %`
                : "—"
          }
          ofTotal={{ num: c.purchases, den: Math.max(1, c.checkout) }}
          definition="Slutfört köp delat med besök som började i kassan."
          emptyLabel="Inga köp än"
        />
        {/* Empty slot so 4+4 grid never leaves a lone card */}
        <div className="hidden lg:block" aria-hidden />
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#1F1F23] dark:bg-[#0F0F12]">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Öppen tratt
          </h2>
          <Link
            href={`/admin/analytics/tratt?${qs}`}
            className="text-sm text-gray-600 underline dark:text-gray-300"
          >
            Öppna Tratt och kassa
          </Link>
        </div>
        <p className="mb-3 text-xs text-gray-500">
          Andelar mot rena besök. Kassan kan vara större än varukorgen, eftersom
          man kan gå direkt till kassan.
        </p>
        <ul className="space-y-2">
          {data.funnel.map((step) => {
            const den = Math.max(1, data.funnel[0]?.count || 1);
            return (
              <li key={step.key} className="flex items-center gap-3 text-sm">
                <div className="w-40 shrink-0 text-gray-700 dark:text-gray-300">
                  {step.label}
                </div>
                <div className="h-3 min-w-0 flex-1 rounded bg-gray-100 dark:bg-zinc-800">
                  {step.count > 0 ? (
                    <div
                      className="h-3 rounded bg-gray-900 dark:bg-white"
                      style={{
                        width: `${(step.count / den) * 100}%`,
                      }}
                    />
                  ) : null}
                </div>
                <div className="w-16 shrink-0 text-right tabular-nums text-gray-600 dark:text-gray-400">
                  {formatSvNumber(step.count)}
                </div>
                <div className="w-20 shrink-0 whitespace-nowrap text-right text-xs tabular-nums text-gray-500">
                  {step.key !== "sessions"
                    ? `${((step.count / den) * 100).toFixed(1).replace(".", ",")} %`
                    : ""}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#1F1F23] dark:bg-[#0F0F12]">
        <h2 className="mb-3 text-lg font-bold text-gray-900 dark:text-white">
          Besökare och sessioner per dag
        </h2>
        {data.annotationsError ? (
          <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-100">
            Anteckningarna kunde inte hämtas. Graferna visas utan markeringar.{" "}
            <button
              type="button"
              className="underline"
              onClick={() => window.location.reload()}
            >
              Försök igen
            </button>
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="text-xs font-medium text-gray-600 dark:text-gray-400">
                <th className="py-2">Datum</th>
                <th className="py-2">Sessioner</th>
                <th className="hidden py-2 sm:table-cell">PLP</th>
                <th className="hidden py-2 sm:table-cell">PDP</th>
                <th className="py-2">Köp</th>
              </tr>
            </thead>
            <tbody>
              {data.series.slice(-14).map((row) => (
                <tr
                  key={row.day}
                  className="border-t border-gray-100 tabular-nums dark:border-zinc-800"
                >
                  <td className="py-2">{row.day}</td>
                  <td className="py-2">{formatSvNumber(row.sessions)}</td>
                  <td className="hidden py-2 sm:table-cell">
                    {formatSvNumber(row.plp)}
                  </td>
                  <td className="hidden py-2 sm:table-cell">
                    {formatSvNumber(row.pdp)}
                  </td>
                  <td className="py-2">{formatSvNumber(row.purchases)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.annotations.length > 0 ? (
          <ul className="mt-4 space-y-1 text-xs text-gray-600 dark:text-gray-400">
            {data.annotations.slice(0, 5).map((a) => (
              <li key={a.id}>
                <span className="font-medium">{a.date}</span> — {a.label}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#1F1F23] dark:bg-[#0F0F12]">
        <h2 className="mb-2 text-lg font-bold text-gray-900 dark:text-white">
          Köp per leveranssätt
        </h2>
        <p className="mb-3 text-xs text-gray-500">
          Ungefärlig sessionkoppling. Köpvärde = vin efter rabatt + frakt (inte
          total_sek).
        </p>
        {data.fulfillment.length === 0 ? (
          <p className="text-sm text-gray-500">Inga slutförda köp i perioden.</p>
        ) : (
          <ul className="space-y-1 text-sm tabular-nums">
            {data.fulfillment.map((f) => (
              <li key={f.channel || "unknown"}>
                {labelFulfillment(f.channel)}: {formatSvNumber(f.count)}
                {" \u00b7 "}
                {formatSvSek(f.valueSek)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
