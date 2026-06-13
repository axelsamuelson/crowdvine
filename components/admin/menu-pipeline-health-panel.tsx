"use client";

import { cn } from "@/lib/utils";
import { Activity, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export type PipelineHealth = {
  sources: {
    total: number;
    completed: number;
    failed: number;
    partial: number;
    pending: number;
    crawling: number;
    skipped: number;
  };
  extraction: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    failed_recent: number;
    stuck_processing: number;
  };
  last_crawl_at: string | null;
  crawled_last_24h: number;
  healthy: boolean;
  issues: string[];
};

export function MenuPipelineHealthPanel({
  health,
  loading,
  onRefresh,
}: {
  health: PipelineHealth | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString("sv-SE") : "—";

  return (
    <div className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] rounded-xl p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "p-2 rounded-lg",
              health?.healthy
                ? "bg-green-100 dark:bg-green-900/30"
                : "bg-amber-100 dark:bg-amber-900/30",
            )}
          >
            {health?.healthy ? (
              <CheckCircle2 className="w-5 h-5 text-green-700 dark:text-green-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-700 dark:text-amber-400" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Pipeline-status
            </h2>
            <p className="text-sm text-gray-500 dark:text-zinc-400">
              {health?.healthy
                ? "Automatiken ser frisk ut"
                : "Något behöver uppmärksamhet"}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="shrink-0"
        >
          <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", loading && "animate-spin")} />
          Uppdatera
        </Button>
      </div>

      {loading && !health ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 dark:border-zinc-600 border-t-gray-900 dark:border-t-white" />
        </div>
      ) : health ? (
        <>
          {health.issues.length > 0 && (
            <ul className="mb-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-1">
              {health.issues.map((issue) => (
                <li
                  key={issue}
                  className="text-sm text-amber-900 dark:text-amber-200 flex items-start gap-2"
                >
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  {issue}
                </li>
              ))}
            </ul>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Crawl klara" value={health.sources.completed} tone="good" />
            <StatCard
              label="PDF ej nedladdad"
              value={health.sources.partial}
              tone={health.sources.partial > 0 ? "warn" : "neutral"}
            />
            <StatCard
              label="Crawl misslyckade"
              value={health.sources.failed}
              tone={health.sources.failed > 0 ? "bad" : "neutral"}
            />
            <StatCard
              label="Väntar crawl"
              value={health.sources.pending}
              tone={health.sources.pending > 5 ? "warn" : "neutral"}
            />
            <StatCard
              label="Väntar extraktion"
              value={health.extraction.pending}
              tone={health.extraction.pending > 20 ? "warn" : "neutral"}
            />
            <StatCard
              label="Extraktion klar"
              value={health.extraction.completed}
              tone="good"
            />
            <StatCard
              label="Extraktion failed (7d)"
              value={health.extraction.failed_recent}
              tone={health.extraction.failed_recent > 10 ? "bad" : "neutral"}
            />
            <StatCard
              label="Crawlat senaste 24h"
              value={health.crawled_last_24h}
              tone={health.crawled_last_24h > 0 ? "good" : "warn"}
            />
            <StatCard
              label="Fastnat processing"
              value={health.extraction.stuck_processing}
              tone={health.extraction.stuck_processing > 0 ? "bad" : "neutral"}
            />
          </div>

          <p className="mt-4 text-xs text-gray-500 dark:text-zinc-400">
            Senaste crawl: {formatDate(health.last_crawl_at)}
            {" · "}
            Crons: crawl 01/07/13/19 UTC (12/batch), retry-crawl 02/08/14/20, extract varje timme :30, retry-extract var 6:e h
          </p>
        </>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "good" | "warn" | "bad" | "neutral";
}) {
  const toneClass =
    tone === "good"
      ? "text-green-700 dark:text-green-400"
      : tone === "warn"
        ? "text-amber-700 dark:text-amber-400"
        : tone === "bad"
          ? "text-red-700 dark:text-red-400"
          : "text-gray-900 dark:text-zinc-100";

  return (
    <div className="rounded-lg border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/70 p-3">
      <p className="text-[11px] text-gray-500 dark:text-zinc-400 mb-1">{label}</p>
      <p className={cn("text-xl font-semibold tabular-nums", toneClass)}>{value}</p>
    </div>
  );
}
