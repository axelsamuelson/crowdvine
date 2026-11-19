"use client";

import { useEffect, useState } from "react";
import type { B2bWeeklyFunnelRow } from "@/lib/analytics/b2b-funnel";
import { WeeklyB2bFunnel } from "./weekly-b2b-funnel";
import type { AnalyticsSiteFilter } from "@/lib/analytics/analytics-site";

export function B2bFunnelPanel({
  site = "all",
  from,
  to,
}: {
  site?: AnalyticsSiteFilter;
  from?: string;
  to?: string;
}) {
  const [weeks, setWeeks] = useState<B2bWeeklyFunnelRow[]>([]);
  const [since, setSince] = useState(from || "2026-08-07");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (site !== "dirtywine" && site !== "all") {
      setWeeks([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const params = new URLSearchParams();
        params.set("site", site === "all" ? "dirtywine" : site);
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        const res = await fetch(
          `/api/admin/analytics/b2b-funnel?${params.toString()}`,
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Kunde inte ladda B2B-tratt");
        if (!cancelled) {
          setWeeks(json.weeklyFunnel ?? []);
          if (typeof json.since === "string") setSince(json.since);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Kunde inte ladda");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [site, from, to]);

  if (site !== "dirtywine" && site !== "all") {
    return null;
  }

  if (loading) {
    return (
      <p className="text-sm text-gray-500 dark:text-zinc-400">
        Laddar B2B-tratt…
      </p>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          Dirty Wine B2B
        </h3>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-zinc-400">
          Kontakt → förfrågan → provning/offert → order. Konvertering = förfrågan
          skickad.
        </p>
      </div>
      <WeeklyB2bFunnel weeks={weeks} since={since} from={from} to={to} />
    </div>
  );
}
