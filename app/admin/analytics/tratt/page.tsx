"use client";

import { Suspense, useState } from "react";
import { AnalyticsPageShell } from "../v2/analytics-page-shell";
import { SimpleFetchPanel } from "../v2/simple-fetch-panel";
import {
  formatSvNumber,
  labelAbandonReason,
  labelCheckoutStep,
  labelChannel,
  labelDevice,
  countryNameSv,
} from "@/lib/analytics/v2/labels";

type FunnelData = {
  status: {
    beforeFilter: number;
    afterFilter: number;
    prerenderSuspect: number;
    lastRefreshAt: string | null;
    warnings?: string[];
  };
  funnel: Array<{ key: string; label: string; count: number }>;
  checkoutSteps: Array<{ step: string; count: number }>;
  abandonReasons: Array<{ reason: string; count: number }>;
  nearPurchase: Array<Record<string, unknown>>;
  voices: Array<Record<string, unknown>>;
};

const TABS = [
  { id: "funnel", label: "Tratt" },
  { id: "steps", label: "Kassasteg" },
  { id: "near", label: "Nära köp" },
  { id: "voices", label: "Röster" },
] as const;

export default function TrattPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("funnel");

  return (
    <AnalyticsPageShell
      title="Tratt och kassa"
      subtitle="Var tappas besökare mellan lista, produkt, varukorg, kassa och köp?"
    >
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={
              tab === t.id
                ? "rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white dark:bg-white dark:text-gray-900"
                : "rounded-md border border-gray-200 px-3 py-1.5 text-sm dark:border-[#1F1F23]"
            }
          >
            {t.label}
          </button>
        ))}
      </div>
      <Suspense fallback={<div className="admin-skel h-32 rounded-xl" />}>
        <SimpleFetchPanel<FunnelData> endpoint="/api/admin/analytics/v2/funnel">
          {(data) => <TrattBody data={data} tab={tab} />}
        </SimpleFetchPanel>
      </Suspense>
    </AnalyticsPageShell>
  );
}

function TrattBody({
  data,
  tab,
}: {
  data: FunnelData;
  tab: (typeof TABS)[number]["id"];
}) {
  // Re-fetch isn't tab-aware in SimpleFetchPanel URL — include tab via effect override:
  // For etapp 1 we render all sections from one payload (API returns all).
  if (tab === "funnel") {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#1F1F23] dark:bg-[#0F0F12]">
        <h2 className="mb-4 text-lg font-bold">Öppen tratt</h2>
        <ul className="space-y-2">
          {data.funnel.map((step, i) => (
            <li key={step.key} className="flex items-center gap-3 text-sm">
              <div className="w-44 shrink-0">{step.label}</div>
              <div className="h-3 flex-1 rounded bg-gray-100 dark:bg-zinc-800">
                <div
                  className="h-3 rounded bg-gray-900 dark:bg-white"
                  style={{
                    width: `${Math.max(2, (step.count / Math.max(1, data.funnel[0]?.count || 1)) * 100)}%`,
                  }}
                />
              </div>
              <div className="w-28 text-right tabular-nums">
                {formatSvNumber(step.count)}
                {i > 0
                  ? ` (${formatSvNumber(data.funnel[i - 1].count)}→)`
                  : ""}
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-gray-500">
          Köp är ungefärligt kopplade via användare + 24 h tills server-event finns.
        </p>
      </section>
    );
  }

  if (tab === "steps") {
    return (
      <div className="space-y-4">
        <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#1F1F23] dark:bg-[#0F0F12]">
          <h2 className="mb-3 text-lg font-bold">Kassasteg</h2>
          <ul className="space-y-2 text-sm">
            {data.checkoutSteps.map((s) => (
              <li key={s.step} className="flex justify-between tabular-nums">
                <span>{labelCheckoutStep(s.step === "unknown" ? null : s.step)}</span>
                <span>{formatSvNumber(s.count)}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#1F1F23] dark:bg-[#0F0F12]">
          <h2 className="mb-3 text-lg font-bold">Avbrottsorsaker</h2>
          {data.abandonReasons.length === 0 ? (
            <p className="text-sm text-gray-500">Inga avbrott i perioden.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {data.abandonReasons.map((r) => (
                <li key={r.reason} className="flex justify-between tabular-nums">
                  <span>{labelAbandonReason(r.reason)}</span>
                  <span>{formatSvNumber(r.count)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    );
  }

  if (tab === "near") {
    return (
      <section className="overflow-x-auto rounded-xl border border-gray-200 bg-white p-6 dark:border-[#1F1F23] dark:bg-[#0F0F12]">
        <h2 className="mb-3 text-lg font-bold">Nära köp</h2>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="text-xs font-medium text-gray-600">
              <th className="py-2">Tid</th>
              <th className="py-2">Kanal</th>
              <th className="py-2">Enhet</th>
              <th className="py-2">Land</th>
              <th className="py-2">Steg</th>
              <th className="py-2">Inbjuden</th>
            </tr>
          </thead>
          <tbody>
            {data.nearPurchase.map((row) => (
              <tr
                key={String(row.session_id)}
                className="border-t border-gray-100 dark:border-zinc-800"
              >
                <td className="py-2 text-xs">{String(row.started_at)}</td>
                <td className="py-2">{labelChannel(String(row.channel || ""))}</td>
                <td className="py-2">{labelDevice(String(row.device || ""))}</td>
                <td className="py-2">
                  {countryNameSv(
                    row.country_code ? String(row.country_code) : null,
                  )}
                </td>
                <td className="py-2">
                  {labelCheckoutStep(
                    row.last_checkout_step
                      ? String(row.last_checkout_step)
                      : null,
                  )}
                </td>
                <td className="py-2">{row.is_invited_friend ? "Ja" : "Nej"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.nearPurchase.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">Inga sessioner nära köp.</p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#1F1F23] dark:bg-[#0F0F12]">
      <h2 className="mb-3 text-lg font-bold">Röster (exit-feedback)</h2>
      {data.voices.length === 0 ? (
        <p className="text-sm text-gray-500">
          Inga svar i perioden, eller tabellen saknas i denna miljö.
        </p>
      ) : (
        <ul className="space-y-3 text-sm">
          {data.voices.map((v) => (
            <li
              key={String(v.id)}
              className="border-t border-gray-100 pt-2 dark:border-zinc-800"
            >
              <div className="text-xs text-gray-500">
                {String(v.created_at)} · {String(v.step || "—")} ·{" "}
                {String(v.page || "—")}
              </div>
              <div>{String(v.answer || "")}</div>
              {v.reason ? (
                <div className="text-xs text-gray-500">{String(v.reason)}</div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
