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
import {
  ANALYTICS_CHANNELS,
  channelLabel,
} from "@/lib/analytics/analytics-channel";

type DailyPoint = {
  date: string;
  visitors: number;
  sessions: number;
  rolling7: number | null;
};

type FunnelRow = {
  sessions: number;
  visitors: number;
  pdp_rate: number;
  add_to_cart_rate: number;
  reservations: number;
};

type ChannelRow = FunnelRow & { channel: string };
type CountryRow = FunnelRow & { country: string };
type CampaignRow = FunnelRow & { campaign: string };
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
  totals?: { visitors: number; sessions: number };
  channels: ChannelRow[];
  countries?: CountryRow[];
  campaigns?: CampaignRow[];
  country?: string | null;
  channel?: string | null;
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

function formatRate(rate: number): string {
  if (!Number.isFinite(rate) || rate <= 0) return "—";
  return `${(rate * 100).toFixed(0)}%`;
}

export function TrafficPanel({
  site = "all",
}: {
  site?: import("@/lib/analytics/analytics-site").AnalyticsSiteFilter;
}) {
  const [data, setData] = useState<TrafficPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const params = new URLSearchParams({
          days: "90",
          site,
        });
        if (countryFilter && countryFilter !== "all") {
          params.set("country", countryFilter);
        }
        if (channelFilter && channelFilter !== "all") {
          params.set("channel", channelFilter);
        }
        const res = await fetch(
          `/api/admin/analytics/traffic?${params.toString()}`,
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
  }, [site, countryFilter, channelFilter]);

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

  const countryOptions = useMemo(() => {
    const rows = data?.countries ?? [];
    return rows.map((c) => c.country).filter((c) => c !== "Unknown");
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

  const periodVisitors =
    data.totals?.visitors ?? data.daily.reduce((s, d) => s + d.visitors, 0);
  const periodSessions =
    data.totals?.sessions ?? data.daily.reduce((s, d) => s + d.sessions, 0);
  const countries = data.countries ?? [];
  const channels = data.channels ?? [];
  const campaigns = data.campaigns ?? [];

  const filterNote = [
    channelFilter !== "all" ? channelLabel(channelFilter) : null,
    countryFilter !== "all" ? countryFilter : null,
  ]
    .filter(Boolean)
    .join(" + ");

  return (
    <div className="space-y-8 text-gray-700 dark:text-gray-300">
      {data.annotationsError && (
        <p className="text-xs text-amber-700 dark:text-amber-300 rounded-md border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 px-3 py-2">
          Annotations unavailable — {data.annotationsError}
        </p>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid grid-cols-2 gap-4 max-w-md">
          <div className="rounded-lg border border-gray-200 dark:border-[#1F1F23] p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Besökare</p>
            <p className="text-2xl font-semibold tabular-nums text-gray-900 dark:text-white">
              {periodVisitors}
            </p>
            <p className="text-[11px] text-gray-400">Unika visitor_id i perioden</p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-[#1F1F23] p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Sessioner</p>
            <p className="text-2xl font-semibold tabular-nums text-gray-900 dark:text-white">
              {periodSessions}
            </p>
            <p className="text-[11px] text-gray-400">Unika session_id i perioden</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Kanal
            </span>
            <select
              className="rounded-md border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] px-3 py-1.5 text-sm text-gray-900 dark:text-white"
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
            >
              <option value="all">Alla kanaler</option>
              {ANALYTICS_CHANNELS.map((ch) => (
                <option key={ch} value={ch}>
                  {channelLabel(ch)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-gray-500 dark:text-gray-400">Land</span>
            <select
              className="rounded-md border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] px-3 py-1.5 text-sm text-gray-900 dark:text-white"
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
            >
              <option value="all">Alla länder</option>
              {countryOptions.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
              {countries.some((c) => c.country === "Unknown") && (
                <option value="Unknown">Unknown</option>
              )}
            </select>
          </label>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Daily visitors & sessions
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Besökare = unika <code className="text-[11px]">visitor_id</code>;
          sessioner = unika <code className="text-[11px]">session_id</code> från{" "}
          <code className="text-[11px]">analytics_sessions_clean</code>. Dagar
          räknas i Europe/Stockholm. Chart starts {data.firstPageViewDate}. Bars
          = daily visitors; line = 7-day visitor average.
          {filterNote ? ` Filtrerat på ${filterNote}.` : ""}
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
                    <p className="text-sm">Besökare: {point.visitors}</p>
                    <p className="text-sm">Sessioner: {point.sessions}</p>
                    {point.rolling7 != null && (
                      <p className="text-sm">7-day avg (besökare): {point.rolling7}</p>
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
              name="Besökare"
              fill="#94a3b8"
              radius={[2, 2, 0, 0]}
              maxBarSize={28}
            />
            <Bar
              dataKey="sessions"
              name="Sessioner"
              fill="#cbd5e1"
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

      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
          Channels
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Channel from the session&apos;s first event (
          <code className="text-[11px]">analytics_channel</code>
          ). Direct includes in-app browsers (TikTok, Instagram), typed URLs,
          and untagged links — not only people who typed pactwines.com.
          {countryFilter !== "all"
            ? ` Showing channels within ${countryFilter}.`
            : ""}
        </p>
        <Table>
          <TableHeader>
            <TableRow className="border-gray-200 dark:border-[#1F1F23]">
              <TableHead>Channel</TableHead>
              <TableHead className="text-right">Sessions</TableHead>
              <TableHead className="text-right">Visitors</TableHead>
              <TableHead className="text-right">PDP-rate</TableHead>
              <TableHead className="text-right">Add-to-cart</TableHead>
              <TableHead className="text-right">Reservations</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {channels.length === 0 ? (
              <TableRow className="border-gray-200 dark:border-[#1F1F23]">
                <TableCell colSpan={6} className="text-sm text-gray-500">
                  No channel data yet.
                </TableCell>
              </TableRow>
            ) : (
              channels.map((c) => {
                const active = channelFilter === c.channel;
                return (
                  <TableRow
                    key={c.channel}
                    className={`border-gray-200 dark:border-[#1F1F23] cursor-pointer ${
                      active ? "bg-gray-50 dark:bg-[#1a1a1e]" : ""
                    }`}
                    onClick={() =>
                      setChannelFilter(active ? "all" : c.channel)
                    }
                  >
                    <TableCell>
                      <span className="capitalize">{channelLabel(c.channel)}</span>
                      {c.channel === "direct" && (
                        <span className="block text-[11px] text-gray-400 font-normal normal-case">
                          App traffic, typed URLs, untagged links
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {c.sessions}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {c.visitors}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-gray-500">
                      {formatRate(c.pdp_rate)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-gray-500">
                      {formatRate(c.add_to_cart_rate)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {c.reservations ?? 0}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
          Campaigns
        </h3>
        <p className="text-xs text-gray-500 dark:text-zinc-400 mb-3">
          Sessions with{" "}
          <code className="text-[11px]">utm_campaign</code> on the first event
          (from page URL or first-touch metadata). Build tagged links under{" "}
          <a
            href="/admin/analytics/links"
            className="underline underline-offset-2 hover:text-gray-700 dark:hover:text-zinc-300"
          >
            UTM links
          </a>
          .
          {channelFilter !== "all" || countryFilter !== "all"
            ? ` Respects channel/country filters.`
            : ""}
        </p>
        <Table>
          <TableHeader>
            <TableRow className="border-gray-200 dark:border-[#1F1F23]">
              <TableHead>Campaign</TableHead>
              <TableHead className="text-right">Sessions</TableHead>
              <TableHead className="text-right">Visitors</TableHead>
              <TableHead className="text-right">PDP-rate</TableHead>
              <TableHead className="text-right">Add-to-cart</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.length === 0 ? (
              <TableRow className="border-gray-200 dark:border-[#1F1F23]">
                <TableCell colSpan={5} className="text-sm text-gray-500">
                  No campaign-tagged sessions yet. Use a tracked link with{" "}
                  <code className="text-[11px]">utm_campaign</code>.
                </TableCell>
              </TableRow>
            ) : (
              campaigns.map((c) => (
                <TableRow
                  key={c.campaign}
                  className="border-gray-200 dark:border-[#1F1F23]"
                >
                  <TableCell className="font-mono text-xs">
                    {c.campaign}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.sessions}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.visitors}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-gray-500">
                    {formatRate(c.pdp_rate)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-gray-500">
                    {formatRate(c.add_to_cart_rate)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
            Countries
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Session attributed to first non-null{" "}
            <code className="text-[11px]">country_code</code>.
            {channelFilter !== "all"
              ? ` Showing countries within ${channelLabel(channelFilter)}.`
              : ""}
          </p>
          <Table>
            <TableHeader>
              <TableRow className="border-gray-200 dark:border-[#1F1F23]">
                <TableHead>Country</TableHead>
                <TableHead className="text-right">Sessions</TableHead>
                <TableHead className="text-right">Visitors</TableHead>
                <TableHead className="text-right">PDP-rate</TableHead>
                <TableHead className="text-right">Add-to-cart</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {countries.length === 0 ? (
                <TableRow className="border-gray-200 dark:border-[#1F1F23]">
                  <TableCell colSpan={5} className="text-sm text-gray-500">
                    No country data yet. Run migration 186 and deploy so Vercel
                    geo headers populate{" "}
                    <code className="text-[11px]">pact_geo_country</code>.
                  </TableCell>
                </TableRow>
              ) : (
                countries.map((c) => {
                  const selectable =
                    c.country !== "Unknown" ? c.country : "Unknown";
                  const active = countryFilter === selectable;
                  return (
                    <TableRow
                      key={c.country}
                      className={`border-gray-200 dark:border-[#1F1F23] cursor-pointer ${
                        active ? "bg-gray-50 dark:bg-[#1a1a1e]" : ""
                      }`}
                      onClick={() =>
                        setCountryFilter(active ? "all" : selectable)
                      }
                    >
                      <TableCell className="font-mono text-xs">
                        {c.country}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {c.sessions}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {c.visitors}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-gray-500">
                        {formatRate(c.pdp_rate)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-gray-500">
                        {formatRate(c.add_to_cart_rate)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
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
