"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Snapshot = {
  id: number;
  domain: string;
  captured_at: string;
  snapshot_date: string;
  open_page_rank: number | null;
  global_rank: number | null;
  referring_domains: number | null;
  gsc_clicks_28d: number | null;
  gsc_impressions_28d: number | null;
  gsc_ctr_28d: number | null;
  gsc_position_28d: number | null;
  sitemap_url_count: number | null;
  authority_score: number;
  components: {
    openPageRank?: number | null;
    referringDomains?: number | null;
    gscImpressions?: number | null;
    sitemapUrls?: number | null;
  };
  sources: Record<string, unknown>;
};

type ApiResponse = {
  targets: string[];
  hasOpenPageRankKey: boolean;
  hasGscKey: boolean;
  snapshots: Snapshot[];
};

function fmt(n: number | null | undefined, digits = 0): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("sv-SE", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits > 0 ? Math.min(digits, 2) : 0,
  });
}

export default function DomainAuthorityAdminPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [domain, setDomain] = useState<string>("pactwines.com");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/domain-authority?domain=${encodeURIComponent(domain)}&limit=52`,
        { cache: "no-store" },
      );
      const json = (await res.json()) as ApiResponse & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Kunde inte hämta data");
      setData(json);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fel vid hämtning");
    } finally {
      setLoading(false);
    }
  }, [domain]);

  useEffect(() => {
    void load();
  }, [load]);

  const latest = data?.snapshots[0] ?? null;
  const history = useMemo(
    () => [...(data?.snapshots ?? [])].reverse(),
    [data?.snapshots],
  );

  const capture = async () => {
    setCapturing(true);
    try {
      const res = await fetch("/api/admin/domain-authority", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domains: [domain] }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        errors?: string[];
        error?: string;
      };
      if (!res.ok && res.status !== 207) {
        throw new Error(json.error ?? "Snapshot misslyckades");
      }
      if (json.errors?.length) {
        toast.warning(json.errors.join(" · "));
      } else {
        toast.success("Snapshot sparad");
      }
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Snapshot misslyckades");
    } finally {
      setCapturing(false);
    }
  };

  const maxScore = Math.max(1, ...history.map((s) => Number(s.authority_score)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Domain authority
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Intern 0–100-poäng (inte Moz DA): Open PageRank + GSC-impressions
            (28 dagar) + sitemap-storlek + referring domains. Sparas veckovis.
          </p>
        </div>
        <Button onClick={() => void capture()} disabled={capturing || loading}>
          {capturing ? "Sparar…" : "Ta snapshot nu"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-gray-600 dark:text-gray-300">
          Domän
          <select
            className="ml-2 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          >
            {(data?.targets ?? ["pactwines.com", "dirtywine.se"]).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          OPR-nyckel:{" "}
          {data?.hasOpenPageRankKey ? "ok" : "saknas (OPEN_PAGERANK_API_KEY)"}
          {" · "}
          GSC: {data?.hasGscKey ? "ok" : "saknas (GSC_SERVICE_ACCOUNT_KEY)"}
        </span>
      </div>

      {loading && !data ? (
        <p className="text-sm text-gray-500">Laddar…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="Authority score"
              value={latest ? fmt(Number(latest.authority_score), 1) : "—"}
              hint="0–100 intern"
            />
            <Metric
              label="Open PageRank"
              value={latest ? fmt(latest.open_page_rank, 2) : "—"}
              hint="0–10 Common Crawl"
            />
            <Metric
              label="GSC impressions (28d)"
              value={latest ? fmt(latest.gsc_impressions_28d) : "—"}
            />
            <Metric
              label="Referring domains"
              value={latest ? fmt(latest.referring_domains) : "—"}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Metric
              label="GSC clicks (28d)"
              value={latest ? fmt(latest.gsc_clicks_28d) : "—"}
            />
            <Metric
              label="Snittposition"
              value={latest ? fmt(latest.gsc_position_28d, 1) : "—"}
            />
            <Metric
              label="Sitemap-URL:er"
              value={latest ? fmt(latest.sitemap_url_count) : "—"}
            />
          </div>

          {history.length > 1 ? (
            <div className="rounded-lg border border-gray-200 p-4 dark:border-zinc-800">
              <h2 className="mb-3 text-sm font-medium text-gray-900 dark:text-white">
                Trend
              </h2>
              <div className="flex h-28 items-end gap-1">
                {history.map((s) => {
                  const h = (Number(s.authority_score) / maxScore) * 100;
                  return (
                    <div
                      key={s.id}
                      className="group relative flex-1 min-w-0"
                      title={`${s.snapshot_date}: ${fmt(Number(s.authority_score), 1)}`}
                    >
                      <div
                        className="w-full rounded-t bg-gray-900 dark:bg-white"
                        style={{ height: `${Math.max(4, h)}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-zinc-800">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-gray-400">
                <tr>
                  <th className="px-3 py-2 font-medium">Datum</th>
                  <th className="px-3 py-2 font-medium">Score</th>
                  <th className="px-3 py-2 font-medium">OPR</th>
                  <th className="px-3 py-2 font-medium">Ref. domains</th>
                  <th className="px-3 py-2 font-medium">Impressions</th>
                  <th className="px-3 py-2 font-medium">Clicks</th>
                  <th className="px-3 py-2 font-medium">Sitemap</th>
                </tr>
              </thead>
              <tbody>
                {(data?.snapshots ?? []).length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-6 text-gray-500 dark:text-gray-400"
                    >
                      Inga snapshots ännu — klicka &quot;Ta snapshot nu&quot;.
                    </td>
                  </tr>
                ) : (
                  (data?.snapshots ?? []).map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-gray-100 dark:border-zinc-800"
                    >
                      <td className="px-3 py-2 whitespace-nowrap">
                        {s.snapshot_date}
                      </td>
                      <td className="px-3 py-2 font-medium">
                        {fmt(Number(s.authority_score), 1)}
                      </td>
                      <td className="px-3 py-2">
                        {fmt(s.open_page_rank, 2)}
                      </td>
                      <td className="px-3 py-2">
                        {fmt(s.referring_domains)}
                      </td>
                      <td className="px-3 py-2">
                        {fmt(s.gsc_impressions_28d)}
                      </td>
                      <td className="px-3 py-2">{fmt(s.gsc_clicks_28d)}</td>
                      <td className="px-3 py-2">
                        {fmt(s.sitemap_url_count)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 px-4 py-3 dark:border-zinc-800">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{hint}</p>
      ) : null}
    </div>
  );
}
