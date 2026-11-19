"use client";

import { Suspense, useState } from "react";
import { AnalyticsPageShell } from "../v2/analytics-page-shell";
import { SimpleFetchPanel } from "../v2/simple-fetch-panel";
import { formatSvNumber } from "@/lib/analytics/v2/labels";
import { formatStockholmDateTime } from "@/lib/analytics/stockholm-time";
import { Button } from "@/components/ui/button";

type DQData = {
  status: {
    beforeFilter: number;
    afterFilter: number;
    prerenderSuspect: number;
    lastRefreshAt: string | null;
    warnings?: string[];
  };
  ladder: Array<{ label: string; count: number }>;
  geoBotHeuristic?: {
    rule: string;
    countries: Array<{
      country: string;
      sessions: number;
      heuristicHits: number;
    }>;
  };
  unknownCountry: number;
  eventWatch: Array<{
    eventType: string;
    lastAt: string | null;
    last14Days: number;
    alert: string | null;
  }>;
  knownGaps: Array<{
    code: string;
    title: string;
    status: string;
    description: string;
    taskId: string | null;
  }>;
  eventLog: Array<Record<string, unknown>>;
  refresh: {
    last_refresh_at: string | null;
    last_status: string | null;
    last_error: string | null;
    sessions_upserted: number | null;
  } | null;
};

const EVENT_LABELS: Record<string, string> = {
  page_view: "Sidvisning",
  product_list_viewed: "Produktlista",
  product_viewed: "Produktsida",
  add_to_cart: "Till varukorg",
  cart_opened: "Öppnad varukorg",
  checkout_started: "Kassa startad",
  checkout_step_viewed: "Kassasteg",
  session_engaged: "Engagemang",
};

export default function DatakvalitetPage() {
  return (
    <AnalyticsPageShell
      title="Datakvalitet"
      subtitle="Kan vi lita på siffrorna den här veckan?"
    >
      <Suspense fallback={<div className="admin-skel h-32 rounded-xl" />}>
        <SimpleFetchPanel<DQData> endpoint="/api/admin/analytics/v2/data-quality">
          {(data) => <DQBody data={data} />}
        </SimpleFetchPanel>
      </Suspense>
    </AnalyticsPageShell>
  );
}

function DQBody({ data }: { data: DQData }) {
  const [sessionId, setSessionId] = useState("");
  const [log, setLog] = useState<Array<Record<string, unknown>>>(data.eventLog);
  const [refreshing, setRefreshing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function loadLog() {
    const res = await fetch(
      `/api/admin/analytics/v2/data-quality?session_id=${encodeURIComponent(sessionId)}`,
    );
    const json = await res.json();
    setLog(json.eventLog || []);
  }

  async function refresh(full: boolean) {
    setRefreshing(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/analytics/v2/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Misslyckades");
      setMsg("Omräkning klar.");
      window.location.reload();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Misslyckades");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#1F1F23] dark:bg-[#0F0F12]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">Filtertrappa</h2>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={refreshing}
              onClick={() => refresh(false)}
            >
              Räkna om
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={refreshing}
              onClick={() => refresh(true)}
            >
              Full omräkning
            </Button>
          </div>
        </div>
        {msg ? <p className="mb-2 text-sm text-gray-600">{msg}</p> : null}
        <ul className="space-y-1 text-sm tabular-nums">
          {data.ladder.map((r) => (
            <li key={r.label} className="flex justify-between">
              <span>{r.label}</span>
              <span>{formatSvNumber(r.count)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-gray-500">
          Okänt land: {formatSvNumber(data.unknownCountry)} sessioner.
          {data.refresh?.last_refresh_at
            ? ` Senaste uppdatering ${formatStockholmDateTime(data.refresh.last_refresh_at)}.`
            : ""}
        </p>
      </section>

      {data.geoBotHeuristic ? (
        <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#1F1F23] dark:bg-[#0F0F12]">
          <h2 className="mb-2 text-lg font-bold">Möjliga bottar per land</h2>
          <p className="mb-3 text-xs text-gray-500">{data.geoBotHeuristic.rule}</p>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs font-medium text-gray-600">
                <th className="py-2">Land</th>
                <th className="py-2">Sessioner</th>
                <th className="py-2">Träffade av heuristik</th>
              </tr>
            </thead>
            <tbody>
              {data.geoBotHeuristic.countries.map((c) => (
                <tr
                  key={c.country}
                  className="border-t border-gray-100 tabular-nums dark:border-zinc-800"
                >
                  <td className="py-2">
                    {c.country === "CN"
                      ? "Kina"
                      : c.country === "SG"
                        ? "Singapore"
                        : c.country === "HK"
                          ? "Hongkong"
                          : c.country}
                  </td>
                  <td className="py-2">{formatSvNumber(c.sessions)}</td>
                  <td className="py-2">{formatSvNumber(c.heuristicHits)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#1F1F23] dark:bg-[#0F0F12]">
        <h2 className="mb-3 text-lg font-bold">Eventvakt</h2>
        <ul className="space-y-2 text-sm">
          {data.eventWatch.map((e) => (
            <li
              key={e.eventType}
              className="flex flex-wrap justify-between gap-2 border-t border-gray-100 py-2 dark:border-zinc-800"
            >
              <span>{EVENT_LABELS[e.eventType] || e.eventType}</span>
              <span className="tabular-nums text-gray-600 dark:text-gray-400">
                {e.lastAt
                  ? formatStockholmDateTime(e.lastAt)
                  : "Ingen tid"}{" "}
                · {formatSvNumber(e.last14Days)} / 14 dagar
                {e.alert ? (
                  <span className="ml-2 text-amber-700 dark:text-amber-300">
                    {e.alert}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#1F1F23] dark:bg-[#0F0F12]">
        <h2 className="mb-3 text-lg font-bold">Kända luckor</h2>
        <ul className="space-y-3 text-sm">
          {data.knownGaps.map((g) => (
            <li key={g.code}>
              <div className="font-medium">
                {g.code}: {g.title}{" "}
                <span className="text-xs font-normal text-gray-500">
                  ({g.status})
                </span>
              </div>
              <p className="text-xs text-gray-500">{g.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#1F1F23] dark:bg-[#0F0F12]">
        <h2 className="mb-3 text-lg font-bold">Händelselogg</h2>
        <p className="mb-2 text-xs text-gray-500">
          Senaste 500 events för en session. Bara för felsökning.
        </p>
        <div className="mb-3 flex flex-wrap gap-2">
          <input
            className="h-9 min-w-[240px] flex-1 rounded-md border border-gray-200 px-2 font-mono text-xs dark:border-[#1F1F23] dark:bg-[#0F0F12]"
            placeholder="session_id"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
          />
          <Button type="button" variant="outline" onClick={loadLog}>
            Hämta
          </Button>
        </div>
        <ul className="max-h-96 space-y-1 overflow-y-auto text-xs">
          {log.map((e) => (
            <li key={String(e.id)} className="font-mono">
              {String(e.created_at)} · {String(e.event_type)} ·{" "}
              {String(e.page_url || "")}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
