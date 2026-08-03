import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import {
  dominantSessionSite,
  parseSiteParam,
} from "@/lib/analytics/analytics-site";

type Channel = "Organic" | "Social" | "Referral" | "Direct";

function toDateKey(iso: string): string {
  return iso.slice(0, 10);
}

function hostnameFromReferrer(referrer: string | null | undefined): string | null {
  if (!referrer || !referrer.trim()) return null;
  try {
    const u = new URL(referrer);
    return u.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function classifyChannel(
  referrer: string | null | undefined,
  pageHost?: string | null,
): Channel {
  const host = hostnameFromReferrer(referrer);
  if (!host) return "Direct";
  if (pageHost && (host === pageHost || host.endsWith(`.${pageHost}`))) {
    return "Direct";
  }
  if (
    host.includes("google") ||
    host.includes("bing") ||
    host.includes("duckduckgo") ||
    host.includes("yahoo") ||
    host.includes("ecosia") ||
    host.includes("baidu") ||
    host.includes("yandex")
  ) {
    return "Organic";
  }
  if (
    host.includes("facebook") ||
    host.includes("instagram") ||
    host.includes("tiktok") ||
    host.includes("twitter") ||
    host === "x.com" ||
    host === "t.co" ||
    host.includes("linkedin") ||
    host.includes("reddit") ||
    host.includes("youtube") ||
    host.includes("youtu.be") ||
    host.includes("pinterest") ||
    host.includes("threads")
  ) {
    return "Social";
  }
  return "Referral";
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

  const sb = getSupabaseAdmin();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const sinceIso = since.toISOString();
  const topPagesSince = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();

  try {
    type TrafficEvent = {
      session_id: string;
      visitor_id?: string | null;
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

    let clean = await fetchPaged(
      "analytics_sessions_clean",
      "session_id, visitor_id, event_type, event_metadata, page_url, referrer, created_at, site",
      cleanExtra,
    );

    // Pre-migration: visitor_id column may not exist yet.
    if (
      clean.error &&
      /visitor_id|schema cache|Could not find/i.test(clean.error.message || "")
    ) {
      clean = await fetchPaged(
        "analytics_sessions_clean",
        "session_id, event_type, event_metadata, page_url, referrer, created_at, site",
        cleanExtra,
      );
    }

    if (clean.error) {
      console.warn(
        "[traffic] analytics_sessions_clean unavailable, falling back:",
        clean.error.message,
      );
      let fallback = await fetchPaged(
        "user_events",
        "session_id, visitor_id, event_type, event_metadata, page_url, referrer, created_at, user_agent, user_id",
        (q) => q.not("session_id", "like", "server_%"),
      );
      if (
        fallback.error &&
        /visitor_id|schema cache|Could not find/i.test(
          fallback.error.message || "",
        )
      ) {
        fallback = await fetchPaged(
          "user_events",
          "session_id, event_type, event_metadata, page_url, referrer, created_at, user_agent, user_id",
          (q) => q.not("session_id", "like", "server_%"),
        );
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

    const rows = events;

    const pageViewDates = rows
      .filter((e) => e.event_type === "page_view")
      .map((e) => toDateKey(String(e.created_at)));
    const firstPageViewDate =
      pageViewDates.length > 0
        ? pageViewDates.reduce((a, b) => (a < b ? a : b))
        : null;

    const dailySessionSets = new Map<string, Set<string>>();
    const dailyVisitorSets = new Map<string, Set<string>>();
    for (const e of rows) {
      const day = toDateKey(String(e.created_at));
      if (firstPageViewDate && day < firstPageViewDate) continue;
      if (!dailySessionSets.has(day)) dailySessionSets.set(day, new Set());
      if (!dailyVisitorSets.has(day)) dailyVisitorSets.set(day, new Set());
      dailySessionSets.get(day)!.add(String(e.session_id));
      const vid =
        typeof e.visitor_id === "string" && e.visitor_id.trim()
          ? e.visitor_id.trim()
          : `session:${e.session_id}`;
      dailyVisitorSets.get(day)!.add(vid);
    }

    const seriesStart = firstPageViewDate
      ? new Date(`${firstPageViewDate}T00:00:00.000Z`)
      : since;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const daily: {
      date: string;
      visitors: number;
      sessions: number;
      rolling7: number | null;
    }[] = [];
    const visitorValues: number[] = [];

    for (
      let d = new Date(seriesStart);
      d <= today;
      d = new Date(d.getTime() + 24 * 60 * 60 * 1000)
    ) {
      const key = d.toISOString().slice(0, 10);
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

    const sessionFirst = new Map<
      string,
      { referrer: string | null; pageUrl: string | null }
    >();
    for (const e of rows) {
      const day = toDateKey(String(e.created_at));
      if (firstPageViewDate && day < firstPageViewDate) continue;
      const sid = String(e.session_id);
      if (sessionFirst.has(sid)) continue;
      sessionFirst.set(sid, {
        referrer: (e.referrer as string) || null,
        pageUrl: (e.page_url as string) || null,
      });
    }

    const channelCounts: Record<Channel, number> = {
      Organic: 0,
      Social: 0,
      Referral: 0,
      Direct: 0,
    };
    for (const { referrer, pageUrl } of sessionFirst.values()) {
      let pageHost: string | null = null;
      try {
        if (pageUrl) pageHost = new URL(pageUrl).hostname.replace(/^www\./, "");
      } catch {
        pageHost = null;
      }
      channelCounts[classifyChannel(referrer, pageHost)] += 1;
    }

    const channels = (Object.keys(channelCounts) as Channel[]).map(
      (name) => ({
        channel: name,
        sessions: channelCounts[name],
      }),
    );

    const pageCounts = new Map<string, number>();
    for (const e of rows) {
      if (e.event_type !== "page_view") continue;
      if (String(e.created_at) < topPagesSince) continue;
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

    const rangeStartDate = firstPageViewDate || sinceIso.slice(0, 10);
    const { data: annotations, error: annErr } = await sb
      .from("admin_analytics_annotations")
      .select("id, date, label, category, created_at")
      .gte("date", rangeStartDate)
      .lte("date", today.toISOString().slice(0, 10))
      .order("date", { ascending: true });

    if (annErr) {
      console.warn("[traffic] annotations:", annErr.message);
    }

    return NextResponse.json({
      days,
      site,
      firstPageViewDate,
      daily,
      totals: {
        visitors: (() => {
          const set = new Set<string>();
          for (const e of rows) {
            const day = toDateKey(String(e.created_at));
            if (firstPageViewDate && day < firstPageViewDate) continue;
            const vid =
              typeof e.visitor_id === "string" && e.visitor_id.trim()
                ? e.visitor_id.trim()
                : `session:${e.session_id}`;
            set.add(vid);
          }
          return set.size;
        })(),
        sessions: (() => {
          const set = new Set<string>();
          for (const e of rows) {
            const day = toDateKey(String(e.created_at));
            if (firstPageViewDate && day < firstPageViewDate) continue;
            set.add(String(e.session_id));
          }
          return set.size;
        })(),
      },
      channels,
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
