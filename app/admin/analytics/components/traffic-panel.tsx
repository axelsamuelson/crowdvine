"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type DailyPoint = {
  date: string;
  visitors: number;
  rolling7: number | null;
};

type ChannelRow = { channel: string; sessions: number };
type TopPage = { path: string; views: number };
type Annotation = {
  id: string;
  date: string;
  label: string;
  category: string;
};

type TrafficPayload = {
  firstPageViewDate: string | null;
  daily: DailyPoint[];
  channels: ChannelRow[];
  topPages: TopPage[];
  annotations: Annotation[];
  annotationsError?: string;
};

const CATEGORY_COLOR: Record<string, string> = {
  seo: "#2563eb",
  tiktok: "#db2777",
  b2b: "#059669",
  product: "#d97706",
  other: "#6b7280",
};

export function TrafficPanel({
  site = "all",
}: {
  site?: import("@/lib/analytics/analytics-site").AnalyticsSiteFilter;
}) {
  const [data, setData] = useState<TrafficPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(
          `/api/admin/analytics/traffic?days=90&site=${site}`,
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load traffic");
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load traffic");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [site]);

  const chartData = useMemo(() => {
    if (!data?.daily) return [];
    return data.daily.map((d) => ({
      ...d,
      label: d.date.slice(5),
    }));
  }, [data]);

  const annotationsByDate = useMemo(() => {
    const map = new Map<string, Annotation[]>();
    for (const a of data?.annotations ?? []) {
      const key = String(a.date).slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return map;
  }, [data]);

  if (loading) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Loading traffic…
      </p>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
    );
  }

  if (!data || !data.firstPageViewDate) {
    return (
      <div className="text-center py-12 space-y-2">
        <p className="text-gray-500 dark:text-gray-400">
          No page_view data yet
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          The Trafik chart starts on the first day page_view events are
          recorded. Browse the site, then refresh this tab.
        </p>
      </div>
    );
  }

  const totalSessions = data.channels.reduce((s, c) => s + c.sessions, 0);

  return (
    <div className="space-y-8 text-gray-700 dark:text-gray-300">
      {data.annotationsError && (
        <p className="text-xs text-amber-700 dark:text-amber-300 rounded-md border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 px-3 py-2">
          Annotations unavailable — {data.annotationsError}
        </p>
      )}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Daily visitors
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Unique clean sessions per day from{" "}
          <code className="text-[11px]">analytics_sessions_clean</code>. Chart
          starts {data.firstPageViewDate}. Bars = daily visitors; line = 7-day
          average.
        </p>
        <ResponsiveContainer width="100%" height={360}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.25} />
            <XAxis
              dataKey="label"
              tick={{ fill: "currentColor", fontSize: 11 }}
              stroke="currentColor"
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "currentColor", fontSize: 11 }}
              stroke="currentColor"
              allowDecimals={false}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0]?.payload as DailyPoint & {
                  label: string;
                };
                const anns = annotationsByDate.get(point.date) ?? [];
                return (
                  <div className="bg-white dark:bg-[#1F1F23] p-3 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg text-gray-900 dark:text-white max-w-xs">
                    <p className="font-semibold text-sm">{point.date}</p>
                    <p className="text-sm">Visitors: {point.visitors}</p>
                    {point.rolling7 != null && (
                      <p className="text-sm">7-day avg: {point.rolling7}</p>
                    )}
                    {anns.map((a) => (
                      <p key={a.id} className="text-xs mt-1 text-amber-700 dark:text-amber-300">
                        {a.category}: {a.label}
                      </p>
                    ))}
                    <span className="sr-only">{label}</span>
                  </div>
                );
              }}
            />
            {(data.annotations ?? []).map((a) => (
              <ReferenceLine
                key={a.id}
                x={String(a.date).slice(5)}
                stroke={CATEGORY_COLOR[a.category] || CATEGORY_COLOR.other}
                strokeDasharray="4 3"
                label={{
                  value: a.label.slice(0, 18),
                  position: "top",
                  fill: CATEGORY_COLOR[a.category] || CATEGORY_COLOR.other,
                  fontSize: 10,
                }}
              />
            ))}
            <Bar
              dataKey="visitors"
              name="Visitors"
              fill="#94a3b8"
              radius={[2, 2, 0, 0]}
              maxBarSize={28}
            />
            <Line
              type="monotone"
              dataKey="rolling7"
              name="7-day avg"
              stroke="#0f172a"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Channels
          </h3>
          <Table>
            <TableHeader>
              <TableRow className="border-gray-200 dark:border-[#1F1F23]">
                <TableHead>Channel</TableHead>
                <TableHead className="text-right">Sessions</TableHead>
                <TableHead className="text-right">Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.channels.map((c) => (
                <TableRow
                  key={c.channel}
                  className="border-gray-200 dark:border-[#1F1F23]"
                >
                  <TableCell>{c.channel}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.sessions}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-gray-500">
                    {totalSessions > 0
                      ? `${((c.sessions / totalSessions) * 100).toFixed(0)}%`
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Top pages (28 days)
          </h3>
          <Table>
            <TableHeader>
              <TableRow className="border-gray-200 dark:border-[#1F1F23]">
                <TableHead>Path</TableHead>
                <TableHead className="text-right">Views</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.topPages.length === 0 ? (
                <TableRow className="border-gray-200 dark:border-[#1F1F23]">
                  <TableCell colSpan={2} className="text-sm text-gray-500">
                    No page_view rows in the last 28 days yet.
                  </TableCell>
                </TableRow>
              ) : (
                data.topPages.map((p) => (
                  <TableRow
                    key={p.path}
                    className="border-gray-200 dark:border-[#1F1F23]"
                  >
                    <TableCell className="font-mono text-xs">{p.path}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {p.views}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
