import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import {
  dominantSessionSite,
  parseSiteParam,
} from "@/lib/analytics/analytics-site";
import {
  ANALYTICS_CHANNELS,
  analyticsChannel,
  parseChannelFilter,
  utmFromPageUrl,
  type AnalyticsChannel,
} from "@/lib/analytics/analytics-channel";
import { normalizeUtmValue } from "@/lib/analytics/utm-normalize";
import {
  eachDateKeyInclusive,
  stockholmTodayDateKey,
  toStockholmDateKey,
} from "@/lib/analytics/stockholm-time";

function toDateKey(iso: string): string {
  return toStockholmDateKey(iso);
}

function pathFromPageUrl(pageUrl: string | null | undefined, metadata: unknown): string {
  const md = metadata && typeof metadata === "object" ? (metadata as Record<string, unknown>) : {};
  if (typeof md.path === "string" && md.path.startsWith("/")) return md.path;
  if (!pageUrl) return "/";
  try {
    return new URL(pageUrl).pathname || "/";
  } catch {
    return pageUrl.startsWith("/") ? pageUrl : "/";
  }
}

function normalizeCountryCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code) || code === "XX") return null;
  return code;
}

function parseCountryFilter(raw: string | null): string | null {
  if (!raw || raw === "all") return null;
  if (raw === "Unknown") return "Unknown";
  return normalizeCountryCode(raw);
}

/** Comma-separated YYYY-MM-DD (Stockholm civil dates). */
function parseDateFilter(raw: string | null): Set<string> | null {
  if (!raw || !raw.trim()) return null;
  const dates = raw
    .split(",")
    .map((s) => s.trim())
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
  if (dates.length === 0) return null;
  return new Set(dates.slice(0, 90));
}

function visitorKey(e: {
  visitor_id?: string | null;
  session_id: string;
}): string {
  return typeof e.visitor_id === "string" && e.visitor_id.trim()
    ? e.visitor_id.trim()
    : `session:${e.session_id}`;
}

function utmFromMetadata(metadata: unknown): {
  source: string | null;
  medium: string | null;
  campaign: string | null;
} {
  const md =
    metadata && typeof metadata === "object"
      ? (metadata as Record<string, unknown>)
      : {};
  const firstTouch =
    md.first_touch && typeof md.first_touch === "object"
      ? (md.first_touch as Record<string, unknown>)
      : null;
  const pick = (obj: Record<string, unknown> | null, k: string) =>
    obj && typeof obj[k] === "string" && (obj[k] as string).trim()
      ? (obj[k] as string).trim()
      : null;
  return {
    source:
      pick(md, "utm_source") ||
      pick(md, "first_utm_source") ||
      pick(firstTouch, "first_utm_source"),
    medium:
      pick(md, "utm_medium") ||
      pick(md, "first_utm_medium") ||
      pick(firstTouch, "first_utm_medium"),
    campaign:
      pick(md, "utm_campaign") ||
      pick(md, "first_utm_campaign") ||
      pick(firstTouch, "first_utm_campaign"),
  };
}

function resolveSessionCampaign(e: {
  page_url?: string | null;
  event_metadata?: unknown;
}): string | null {
  const fromMeta = utmFromMetadata(e.event_metadata);
  const fromUrl = utmFromPageUrl(e.page_url);
  const raw = fromMeta.campaign || fromUrl.campaign;
  if (!raw) return null;
  const normalized = normalizeUtmValue(raw);
  return normalized || null;
}

function classifyEventChannel(e: {
  channel?: string | null;
  referrer?: string | null;
  page_url?: string | null;
  event_metadata?: unknown;
}): AnalyticsChannel {
  if (
    typeof e.channel === "string" &&
    (ANALYTICS_CHANNELS as readonly string[]).includes(e.channel)
  ) {
    return e.channel as AnalyticsChannel;
  }
  const fromMeta = utmFromMetadata(e.event_metadata);
  const fromUrl = utmFromPageUrl(e.page_url);
  return analyticsChannel(
    e.referrer,
    fromMeta.source || fromUrl.source,
    fromMeta.medium || fromUrl.medium,
  );
}

type FunnelAgg = {
  sessions: Set<string>;
  visitors: Set<string>;
  pdp: Set<string>;
  cart: Set<string>;
  reservation: Set<string>;
};

function emptyFunnel(): FunnelAgg {
  return {
    sessions: new Set(),
    visitors: new Set(),
    pdp: new Set(),
    cart: new Set(),
    reservation: new Set(),
  };
}

function funnelToRow(
  key: string,
  keyName: "channel" | "country" | "campaign",
  agg: FunnelAgg,
) {
  const sessions = agg.sessions.size;
  return {
    [keyName]: key,
    sessions,
    visitors: agg.visitors.size,
    pdp_rate: sessions > 0 ? agg.pdp.size / sessions : 0,
    add_to_cart_rate: sessions > 0 ? agg.cart.size / sessions : 0,
    reservations: agg.reservation.size,
  };
}

export async function GET(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const daysRaw = Number(searchParams.get("days") || "90");
  const days = Number.isFinite(daysRaw)
    ? Math.min(365, Math.max(7, Math.round(daysRaw)))
    : 90;
  const site = parseSiteParam(searchParams.get("site"));
  const countryFilter = parseCountryFilter(searchParams.get("country"));
  const channelFilter = parseChannelFilter(searchParams.get("channel"));
  const dateFilter = parseDateFilter(searchParams.get("dates"));

  const sb = getSupabaseAdmin();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const sinceIso = since.toISOString();
  const topPagesSince = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();

  try {
    type TrafficEvent = {
      session_id: string;
      visitor_id?: string | null;
      country_code?: string | null;
      channel?: string | null;
      event_type: string;
      event_metadata: unknown;
      page_url: string | null;
      referrer: string | null;
      created_at: string;
      user_agent?: string | null;
      user_id?: string | null;
      site?: string | null;
    };

    const pageSize = 1000;
    const maxRows = 20000;

    async function fetchPaged(
      fromTable: string,
      selectCols: string,
      extra?: (q: any) => any,
    ): Promise<{ rows: TrafficEvent[]; error: { message: string } | null }> {
      const out: TrafficEvent[] = [];
      for (let from = 0; from < maxRows; from += pageSize) {
        const to = from + pageSize - 1;
        let q = sb
          .from(fromTable)
          .select(selectCols)
          .gte("created_at", sinceIso)
          .order("created_at", { ascending: true })
          .range(from, to);
        if (extra) q = extra(q);
        const { data, error } = await q;
        if (error) return { rows: out, error };
        const batch = (data ?? []) as TrafficEvent[];
        out.push(...batch);
        if (batch.length < pageSize) break;
      }
      return { rows: out, error: null };
    }

    let events: TrafficEvent[] = [];
    const cleanExtra =
      site === "all" ? undefined : (q: any) => q.eq("site", site);

    const selects = [
      "session_id, visitor_id, country_code, channel, event_type, event_metadata, page_url, referrer, created_at, site",
      "session_id, visitor_id, country_code, event_type, event_metadata, page_url, referrer, created_at, site",
      "session_id, visitor_id, event_type, event_metadata, page_url, referrer, created_at, site",
      "session_id, event_type, event_metadata, page_url, referrer, created_at, site",
    ];

    let clean: { rows: TrafficEvent[]; error: { message: string } | null } = {
      rows: [],
      error: { message: "not started" },
    };
    for (const cols of selects) {
      clean = await fetchPaged("analytics_sessions_clean", cols, cleanExtra);
      if (!clean.error) break;
      if (
        !/channel|country_code|visitor_id|schema cache|Could not find/i.test(
          clean.error.message || "",
        )
      ) {
        break;
      }
    }

    if (clean.error) {
      console.warn(
        "[traffic] analytics_sessions_clean unavailable, falling back:",
        clean.error.message,
      );
      const fallbackSelects = [
        "session_id, visitor_id, country_code, event_type, event_metadata, page_url, referrer, created_at, user_agent, user_id",
        "session_id, visitor_id, event_type, event_metadata, page_url, referrer, created_at, user_agent, user_id",
        "session_id, event_type, event_metadata, page_url, referrer, created_at, user_agent, user_id",
      ];
      let fallback: {
        rows: TrafficEvent[];
        error: { message: string } | null;
      } = { rows: [], error: { message: "not started" } };
      for (const cols of fallbackSelects) {
        fallback = await fetchPaged("user_events", cols, (q) =>
          q.not("session_id", "like", "server_%"),
        );
        if (!fallback.error) break;
        if (
          !/country_code|visitor_id|schema cache|Could not find/i.test(
            fallback.error.message || "",
          )
        ) {
          break;
        }
      }
      if (fallback.error) throw fallback.error;
      const internalSessions = new Set<string>();
      const urlsBySession = new Map<string, (string | null)[]>();
      for (const e of fallback.rows) {
        const md =
          e.event_metadata && typeof e.event_metadata === "object"
            ? (e.event_metadata as Record<string, unknown>)
            : {};
        if (md.internal === true) {
          internalSessions.add(String(e.session_id));
        }
        if (!urlsBySession.has(e.session_id)) {
          urlsBySession.set(e.session_id, []);
        }
        urlsBySession.get(e.session_id)!.push(e.page_url);
      }
      const sessionSite = new Map<string, string>();
      for (const [sid, urls] of urlsBySession) {
        const s = dominantSessionSite(urls);
        if (s) sessionSite.set(sid, s);
      }
      events = fallback.rows
        .filter((e) => {
          if (internalSessions.has(String(e.session_id))) return false;
          const ua = (e.user_agent as string) || "";
          if (/bot|crawl|spider|headless|lighthouse|slurp/i.test(ua)) return false;
          const ref = (e.referrer as string) || "";
          if (ref.toLowerCase().includes("localhost")) return false;
          const s = sessionSite.get(e.session_id);
          if (!s) return false;
          if (site !== "all" && s !== site) return false;
          return true;
        })
        .map((e) => ({ ...e, site: sessionSite.get(e.session_id) ?? null }));
    } else {
      events = clean.rows;
    }

    const allRows = events;

    const allPageViewDates = allRows
      .filter((e) => e.event_type === "page_view")
      .map((e) => toDateKey(String(e.created_at)));
    const globalFirstPageViewDate =
      allPageViewDates.length > 0
        ? allPageViewDates.reduce((a, b) => (a < b ? a : b))
        : null;

    const sessionCountry = new Map<string, string | null>();
    const sessionChannel = new Map<string, AnalyticsChannel>();
    const sessionCampaign = new Map<string, string | null>();
    const sessionVisitors = new Map<string, string>();
    const sessionHasPdp = new Set<string>();
    const sessionHasCart = new Set<string>();
    const sessionHasReservation = new Set<string>();
    const sessionOnSelectedDates = new Set<string>();

    for (const e of allRows) {
      const day = toDateKey(String(e.created_at));
      if (globalFirstPageViewDate && day < globalFirstPageViewDate) continue;
      const sid = String(e.session_id);
      const onSelectedDay = !dateFilter || dateFilter.has(day);

      if (!sessionChannel.has(sid)) {
        // First event in chronological fetch order (rows ordered by created_at ASC)
        sessionChannel.set(sid, classifyEventChannel(e));
        sessionCampaign.set(sid, resolveSessionCampaign(e));
      }

      if (!sessionCountry.has(sid)) {
        sessionCountry.set(sid, null);
      }
      if (sessionCountry.get(sid) == null) {
        const cc = normalizeCountryCode(e.country_code);
        if (cc) sessionCountry.set(sid, cc);
      }

      if (!sessionVisitors.has(sid)) {
        sessionVisitors.set(sid, visitorKey(e));
      }
      if (onSelectedDay) {
        sessionOnSelectedDates.add(sid);
        if (e.event_type === "product_viewed") sessionHasPdp.add(sid);
        if (e.event_type === "add_to_cart") sessionHasCart.add(sid);
        if (e.event_type === "reservation_completed") {
          sessionHasReservation.add(sid);
        }
      }
    }

    const matchesCountry = (sid: string) => {
      if (countryFilter == null) return true;
      const cc = sessionCountry.get(sid) ?? null;
      if (countryFilter === "Unknown") return cc == null;
      return cc === countryFilter;
    };

    const matchesChannel = (sid: string) => {
      if (channelFilter == null) return true;
      return sessionChannel.get(sid) === channelFilter;
    };

    const matchesDates = (sid: string) => {
      if (!dateFilter) return true;
      return sessionOnSelectedDates.has(sid);
    };

    const addSessionToFunnel = (bucket: FunnelAgg, sid: string) => {
      bucket.sessions.add(sid);
      bucket.visitors.add(sessionVisitors.get(sid) ?? `session:${sid}`);
      if (sessionHasPdp.has(sid)) bucket.pdp.add(sid);
      if (sessionHasCart.has(sid)) bucket.cart.add(sid);
      if (sessionHasReservation.has(sid)) bucket.reservation.add(sid);
    };

    // Channel breakdown respects country (+ site) filter
    const byChannel = new Map<string, FunnelAgg>();
    for (const ch of ANALYTICS_CHANNELS) byChannel.set(ch, emptyFunnel());
    for (const [sid, ch] of sessionChannel) {
      if (!matchesCountry(sid) || !matchesDates(sid)) continue;
      const bucket = byChannel.get(ch) ?? emptyFunnel();
      if (!byChannel.has(ch)) byChannel.set(ch, bucket);
      addSessionToFunnel(bucket, sid);
    }
    const channelRows = ANALYTICS_CHANNELS.map((ch) =>
      funnelToRow(ch, "channel", byChannel.get(ch) ?? emptyFunnel()),
    ).sort(
      (a, b) =>
        (b as { sessions: number }).sessions -
        (a as { sessions: number }).sessions,
    );

    // Country breakdown respects channel (+ site) filter
    const byCountry = new Map<string, FunnelAgg>();
    for (const [sid, cc] of sessionCountry) {
      if (!matchesChannel(sid) || !matchesDates(sid)) continue;
      if (!sessionChannel.has(sid)) continue;
      const key = cc ?? "Unknown";
      if (!byCountry.has(key)) byCountry.set(key, emptyFunnel());
      addSessionToFunnel(byCountry.get(key)!, sid);
    }
    const countryRows = Array.from(byCountry.entries())
      .map(([country, agg]) => funnelToRow(country, "country", agg))
      .sort(
        (a, b) =>
          (b as { sessions: number }).sessions -
          (a as { sessions: number }).sessions,
      );

    // Campaign breakdown: sessions with utm_campaign on first event
    const byCampaign = new Map<string, FunnelAgg>();
    for (const [sid, campaign] of sessionCampaign) {
      if (!campaign) continue;
      if (!matchesCountry(sid) || !matchesChannel(sid) || !matchesDates(sid)) {
        continue;
      }
      if (!byCampaign.has(campaign)) byCampaign.set(campaign, emptyFunnel());
      addSessionToFunnel(byCampaign.get(campaign)!, sid);
    }
    const campaignRows = Array.from(byCampaign.entries())
      .map(([campaign, agg]) => funnelToRow(campaign, "campaign", agg))
      .sort(
        (a, b) =>
          (b as { sessions: number }).sessions -
          (a as { sessions: number }).sessions,
      );

    // Combined filters for chart / top pages / totals
    const filteredSessionIds = new Set(
      [...sessionChannel.keys()].filter(
        (sid) => matchesCountry(sid) && matchesChannel(sid) && matchesDates(sid),
      ),
    );

    const rows = allRows.filter((e) => {
      if (!filteredSessionIds.has(String(e.session_id))) return false;
      if (!dateFilter) return true;
      return dateFilter.has(toDateKey(String(e.created_at)));
    });

    // Full daily series still uses channel/country (not date) so the chart
    // stays clickable for multi-select.
    const chartSessionIds = new Set(
      [...sessionChannel.keys()].filter(
        (sid) => matchesCountry(sid) && matchesChannel(sid),
      ),
    );
    const chartRows = allRows.filter((e) =>
      chartSessionIds.has(String(e.session_id)),
    );

    const pageViewDates = chartRows
      .filter((e) => e.event_type === "page_view")
      .map((e) => toDateKey(String(e.created_at)));
    const firstPageViewDate =
      pageViewDates.length > 0
        ? pageViewDates.reduce((a, b) => (a < b ? a : b))
        : globalFirstPageViewDate;

    const dailySessionSets = new Map<string, Set<string>>();
    const dailyVisitorSets = new Map<string, Set<string>>();
    for (const e of chartRows) {
      const day = toDateKey(String(e.created_at));
      if (firstPageViewDate && day < firstPageViewDate) continue;
      if (!dailySessionSets.has(day)) dailySessionSets.set(day, new Set());
      if (!dailyVisitorSets.has(day)) dailyVisitorSets.set(day, new Set());
      dailySessionSets.get(day)!.add(String(e.session_id));
      dailyVisitorSets.get(day)!.add(visitorKey(e));
    }

    const todayKey = stockholmTodayDateKey();
    const seriesStartKey =
      firstPageViewDate || toStockholmDateKey(since.toISOString());

    const daily: {
      date: string;
      visitors: number;
      sessions: number;
      rolling7: number | null;
    }[] = [];
    const visitorValues: number[] = [];

    for (const key of eachDateKeyInclusive(seriesStartKey, todayKey)) {
      if (firstPageViewDate && key < firstPageViewDate) continue;
      const visitors = dailyVisitorSets.get(key)?.size ?? 0;
      const sessions = dailySessionSets.get(key)?.size ?? 0;
      visitorValues.push(visitors);
      const window = visitorValues.slice(-7);
      const rolling7 =
        window.length >= 7
          ? Math.round((window.reduce((a, b) => a + b, 0) / window.length) * 10) /
            10
          : null;
      daily.push({ date: key, visitors, sessions, rolling7 });
    }

    const pageCounts = new Map<string, number>();
    for (const e of rows) {
      if (e.event_type !== "page_view") continue;
      if (!dateFilter && String(e.created_at) < topPagesSince) continue;
      const path = pathFromPageUrl(
        e.page_url as string | null,
        e.event_metadata,
      );
      pageCounts.set(path, (pageCounts.get(path) || 0) + 1);
    }
    const topPages = Array.from(pageCounts.entries())
      .map(([path, views]) => ({ path, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 25);

    const rangeStartDate =
      firstPageViewDate || toStockholmDateKey(sinceIso);
    const { data: annotations, error: annErr } = await sb
      .from("admin_analytics_annotations")
      .select("id, date, label, category, created_at")
      .gte("date", rangeStartDate)
      .lte("date", todayKey)
      .order("date", { ascending: true });

    if (annErr) {
      console.warn("[traffic] annotations:", annErr.message);
    }

    return NextResponse.json({
      days,
      site,
      country: countryFilter,
      channel: channelFilter,
      dates: dateFilter ? [...dateFilter].sort() : [],
      firstPageViewDate,
      daily,
      totals: {
        visitors: (() => {
          const set = new Set<string>();
          for (const e of rows) {
            const day = toDateKey(String(e.created_at));
            if (firstPageViewDate && day < firstPageViewDate) continue;
            set.add(visitorKey(e));
          }
          return set.size;
        })(),
        sessions: filteredSessionIds.size,
      },
      channels: channelRows,
      countries: countryRows,
      campaigns: campaignRows,
      topPages,
      annotations: annErr ? [] : (annotations ?? []),
      annotationsError: annErr
        ? "Run migrations/175_analytics_traffic_and_annotations.sql"
        : undefined,
    });
  } catch (err) {
    console.error("Analytics traffic API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch traffic analytics" },
      { status: 500 },
    );
  }
}
