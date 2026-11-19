"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  analyticsV2ToQueryString,
  parseAnalyticsV2Filters,
} from "@/lib/analytics/v2/filters";
import { DataStatusLine, type DataStatusProps } from "./data-status-line";

export function SimpleFetchPanel<T extends { status: DataStatusProps }>({
  endpoint,
  children,
}: {
  endpoint: string;
  children: (data: T, qs: string) => ReactNode;
}) {
  const searchParams = useSearchParams();
  const filters = parseAnalyticsV2Filters(searchParams);
  const qs = analyticsV2ToQueryString(filters);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const join = endpoint.includes("?") ? "&" : "?";
        const res = await fetch(`${endpoint}${qs ? `${join}${qs}` : ""}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Kunde inte hämta data");
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Kunde inte hämta data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [endpoint, qs]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Hämtar …
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
        {error || "Kunde inte hämta data. Försök igen."}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DataStatusLine {...data.status} queryString={qs} />
      {children(data, qs)}
    </div>
  );
}
