"use client";

import { Suspense, useState } from "react";
import { AnalyticsPageShell } from "../v2/analytics-page-shell";
import { SimpleFetchPanel } from "../v2/simple-fetch-panel";
import {
  formatSvNumber,
  formatSvPercent,
  labelAbandonReason,
  labelCheckoutStep,
  labelChannel,
  labelDevice,
  countryNameSv,
} from "@/lib/analytics/v2/labels";
import {
  ScrollTable,
  stickyFirstTd,
  stickyFirstTh,
} from "../v2/scroll-table";

type FunnelData = {
  status: {
    beforeFilter: number;
    afterFilter: number;
    prerenderSuspect: number;
    lastRefreshAt: string | null;
    warnings?: string[];
  };
  mode: "open" | "closed";
  note: string;
  checkoutCanExceedCart?: boolean;
  funnel: Array<{
    key: string;
    label: string;
    count: number;
    ofSessions?: number | null;
    ofPrevious?: number | null;
  }>;
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
  const [funnelMode, setFunnelMode] = useState<"open" | "closed">("open");

  return (
    <AnalyticsPageShell
      title="Tratt och kassa"
      subtitle="Var tappas besökare mellan lista, produkt, varukorg, kassa och köp?"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
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
        {tab === "funnel" ? (
          <div className="flex gap-1 rounded-md border border-gray-200 p-0.5 text-sm dark:border-[#1F1F23]">
            <button
              type="button"
              className={
                funnelMode === "open"
                  ? "rounded bg-gray-900 px-2.5 py-1 text-white dark:bg-white dark:text-gray-900"
                  : "px-2.5 py-1 text-gray-600"
              }
              onClick={() => setFunnelMode("open")}
            >
              Öppen
            </button>
            <button
              type="button"
              className={
                funnelMode === "closed"
                  ? "rounded bg-gray-900 px-2.5 py-1 text-white dark:bg-white dark:text-gray-900"
                  : "px-2.5 py-1 text-gray-600"
              }
              onClick={() => setFunnelMode("closed")}
            >
              Stängd
            </button>
          </div>
        ) : null}
      </div>
      <Suspense fallback={<div className="admin-skel h-32 rounded-xl" />}>
        <SimpleFetchPanel<FunnelData>
          endpoint={`/api/admin/analytics/v2/funnel?funnel_mode=${funnelMode}`}
        >
          {(data) => <TrattBody data={data} tab={tab} funnelMode={funnelMode} />}
        </SimpleFetchPanel>
      </Suspense>
    </AnalyticsPageShell>
  );
}

function TrattBody({
  data,
  tab,
  funnelMode,
}: {
  data: FunnelData;
  tab: (typeof TABS)[number]["id"];
  funnelMode: "open" | "closed";
}) {
  const sessions = data.funnel[0]?.count ?? 0;

  if (tab === "funnel") {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#1F1F23] dark:bg-[#0F0F12]">
        <h2 className="mb-4 text-lg font-bold">
          {funnelMode === "open" ? "Öppen tratt" : "Stängd tratt"}
        </h2>

        {data.checkoutCanExceedCart ? (
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Kassan kan vara större än varukorgen, eftersom man kan gå direkt till
            kassan.
          </p>
        ) : (
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            {data.note}
          </p>
        )}

        <ul className="space-y-2">
          {data.funnel.map((step) => {
            const ofSessions =
              step.ofSessions ??
              (sessions > 0 ? step.count / sessions : null);
            const ofPrevious = step.ofPrevious ?? null;
            const showPct = step.key !== "sessions" && sessions >= 10;
            return (
              <li key={step.key} className="flex items-center gap-3 text-sm">
                <div className="w-44 shrink-0">{step.label}</div>
                <div className="h-3 flex-1 rounded bg-gray-100 dark:bg-zinc-800">
                  <div
                    className="h-3 rounded bg-gray-900 dark:bg-white"
                    style={{
                      width: `${Math.max(
                        2,
                        (step.count / Math.max(1, sessions)) * 100,
                      )}%`,
                    }}
                  />
                </div>
                <div className="w-44 text-right text-xs tabular-nums">
                  {formatSvNumber(step.count)}
                  {showPct && ofSessions != null
                    ? ` · ${formatSvPercent(ofSessions)} av besök`
                    : ""}
                  {showPct && ofPrevious != null && step.key !== "engaged"
                    ? ` · ${formatSvPercent(ofPrevious)} av föreg.`
                    : ""}
                  {step.key !== "sessions" && sessions < 10
                    ? " · För få besök för andel"
                    : ""}
                </div>
              </li>
            );
          })}
        </ul>
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
                <span>
                  {labelCheckoutStep(s.step === "unknown" ? null : s.step)}
                </span>
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
      <ScrollTable minWidth="640px">
        <thead>
          <tr className="text-xs font-medium text-gray-600">
            <th className={stickyFirstTh}>Tid</th>
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
              <td className={`${stickyFirstTd} text-xs`}>
                {String(row.started_at)}
              </td>
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
      </ScrollTable>
    );
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#1F1F23] dark:bg-[#0F0F12]">
      <h2 className="mb-3 text-lg font-bold">Röster</h2>
      {data.voices.length === 0 ? (
        <p className="text-sm text-gray-500">Inga röster i perioden.</p>
      ) : (
        <ul className="space-y-3 text-sm">
          {data.voices.slice(0, 40).map((v) => (
            <li
              key={String(v.id)}
              className="border-t border-gray-100 pt-2 dark:border-zinc-800"
            >
              <div className="text-xs text-gray-500">
                {String(v.created_at)} · {String(v.step || v.page || "")}
              </div>
              <div>{String(v.answer || v.reason || "")}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
