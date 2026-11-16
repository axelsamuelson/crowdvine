import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import {
  buildIntentSessionsFromCleanEvents,
  buildWeeklyFunnelFromCleanEvents,
  computeMetrics28d,
  type CleanEventRow,
  type IntentSessionRow,
  type IntentWine,
} from "@/lib/analytics/intent-sessions";
import {
  dominantSessionSite,
  parseSiteParam,
  type AnalyticsSiteFilter,
} from "@/lib/analytics/analytics-site";
import { canonicalizeEventType } from "@/lib/analytics/event-aliases";
import {
  fetchEventsInDateChunks,
  type PageQueryArgs,
} from "@/lib/analytics/fetch-events-window";

/** Clean-view attempt budget — parallel date chunks finish far under this. */
const CLEAN_VIEW_TIMEOUT_MS = 12_000;

async function fetchCleanEvents(
  sb: ReturnType<typeof getSupabaseAdmin>,
  sinceIso: string,
  site: AnalyticsSiteFilter,
  opts?: { lean?: boolean },
): Promise<{
  rows: CleanEventRow[];
  fromCleanView: boolean;
  truncated: boolean;
  earliestCoveredDate: string | null;
}> {
  const pageSize = 1000;
  const maxRows = 100_000;
  const untilIso = new Date().toISOString();
  const lean = opts?.lean === true;
  // Lean keeps event_metadata (needed for identical intent_sessions counts)
  // but drops page_url to shrink payloads for metrics-only dashboard loads.
  const selectCols = lean
    ? "session_id, visitor_id, user_id, event_type, event_metadata, created_at, site"
    : "session_id, visitor_id, user_id, event_type, event_metadata, created_at, page_url, site";

  async function paged(
    table: string,
    selectOverride?: string,
    extra?: (q: any) => any,
    pageOpts?: { signal?: AbortSignal },
  ) {
    const cols =
      selectOverride ??
      (table === "user_events"
        ? lean
          ? "session_id, visitor_id, user_id, event_type, event_metadata, created_at"
          : "session_id, visitor_id, user_id, event_type, event_metadata, created_at, page_url"
        : selectCols);
    return fetchEventsInDateChunks<CleanEventRow>({
      sinceIso,
      untilIso,
      pageSize,
      maxRows,
      chunkDays: 7,
      concurrency: 6,
      signal: pageOpts?.signal,
      queryPage: async ({ gteIso, ltIso, from, to, signal }: PageQueryArgs) => {
        let q = sb
          .from(table)
          .select(cols)
          .gte("created_at", gteIso)
          .order("created_at", { ascending: true })
          .range(from, to);
        if (ltIso) q = q.lt("created_at", ltIso);
        if (extra) q = extra(q);
        if (signal) q = q.abortSignal(signal);
        return q;
      },
    });
  }

  async function pagedClean(
    selectOverride?: string,
  ): Promise<Awaited<ReturnType<typeof paged>>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CLEAN_VIEW_TIMEOUT_MS);
    try {
      const result = await paged(
        "analytics_sessions_clean",
        selectOverride,
        site === "all" ? undefined : (q) => q.eq("site", site),
        { signal: controller.signal },
      );
      if (controller.signal.aborted && !result.error) {
        return {
          rows: [],
          truncated: false,
          earliestCoveredDate: null,
          latestCoveredDate: null,
          error: {
            message: `client timeout after ${CLEAN_VIEW_TIMEOUT_MS}ms`,
          },
          complete: false,
        };
      }
      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "clean view fetch failed";
      return {
        rows: [],
        truncated: false,
        earliestCoveredDate: null,
        latestCoveredDate: null,
        error: { message },
        complete: false,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  let clean = await pagedClean();
  if (
    clean.error &&
    /visitor_id|schema cache|Could not find/i.test(clean.error.message || "")
  ) {
    clean = await pagedClean(
      "session_id, user_id, event_type, event_metadata, created_at, page_url, site",
    );
  }
  if (!clean.error) {
    return {
      rows: clean.rows,
      fromCleanView: true,
      truncated: clean.truncated,
      earliestCoveredDate: clean.earliestCoveredDate,
    };
  }

  console.warn(
    "[intent] analytics_sessions_clean unavailable:",
    clean.error.message,
  );
  let fallback = await paged("user_events", undefined, (q) =>
    q.not("session_id", "like", "server_%"),
  );
  if (
    fallback.error &&
    /visitor_id|schema cache|Could not find/i.test(fallback.error.message || "")
  ) {
    fallback = await paged(
      "user_events",
      "session_id, user_id, event_type, event_metadata, created_at, page_url",
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
    if (md.internal === true) internalSessions.add(e.session_id);
    if (!urlsBySession.has(e.session_id)) urlsBySession.set(e.session_id, []);
    urlsBySession.get(e.session_id)!.push(e.page_url ?? null);
  }
  const sessionSite = new Map<string, string>();
  for (const [sid, urls] of urlsBySession) {
    const s = dominantSessionSite(urls);
    if (s) sessionSite.set(sid, s);
  }

  const rows = fallback.rows
    .filter((e) => {
      if (internalSessions.has(e.session_id)) return false;
      const s = sessionSite.get(e.session_id);
      if (!s) return false;
      if (site !== "all" && s !== site) return false;
      return true;
    })
    .map((e) => ({ ...e, site: sessionSite.get(e.session_id) ?? null }));

  return {
    rows,
    fromCleanView: false,
    truncated: fallback.truncated,
    earliestCoveredDate: fallback.earliestCoveredDate,
  };
}

async function fetchReservationsByUser(
  sb: ReturnType<typeof getSupabaseAdmin>,
  sinceIso: string,
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  const lookback = new Date(
    new Date(sinceIso).getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const pageSize = 1000;
  for (let from = 0; from < 20000; from += pageSize) {
    const { data, error } = await sb
      .from("order_reservations")
      .select("user_id, created_at")
      .gte("created_at", lookback)
      .not("user_id", "is", null)
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) {
      console.warn("[intent] order_reservations:", error.message);
      break;
    }
    const batch = data ?? [];
    for (const row of batch) {
      if (!row.user_id) continue;
      if (!map.has(row.user_id)) map.set(row.user_id, []);
      map.get(row.user_id)!.push(row.created_at);
    }
    if (batch.length < pageSize) break;
  }
  return map;
}

function parseWines(raw: unknown): IntentWine[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((w) => {
      if (!w || typeof w !== "object") return null;
      const o = w as Record<string, unknown>;
      return {
        productId: String(o.productId ?? ""),
        productName: String(o.productName ?? o.productId ?? ""),
        quantity: Number(o.quantity) || 0,
        price: Number(o.price) || 0,
      };
    })
    .filter((w): w is IntentWine => !!w && w.quantity > 0);
}

export async function GET(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const daysRaw = Number(searchParams.get("days") || "30");
  const days = Number.isFinite(daysRaw)
    ? Math.min(180, Math.max(7, Math.round(daysRaw)))
    : 30;
  const site = parseSiteParam(searchParams.get("site"));
  /** Dashboard metrics cards only — skip session enrichment / profiles. */
  const metricsOnly =
    searchParams.get("metricsOnly") === "1" ||
    searchParams.get("metricsOnly") === "true";

  const sb = getSupabaseAdmin();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const sinceIso = since.toISOString();
  const since28 = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const intentSelectWithReason =
      "session_id, site, user_id, started_at, last_seen_at, wines, cart_value, reached_checkout, last_checkout_phase, abandoned_phase, abandon_reason, last_step, last_checkout_error, is_human";
    const intentSelectLegacy =
      "session_id, site, user_id, started_at, last_seen_at, wines, cart_value, reached_checkout, last_checkout_phase, abandoned_phase, last_step, last_checkout_error, is_human";

    const cleanPromise = fetchCleanEvents(sb, sinceIso, site, {
      lean: metricsOnly,
    });
    const reservationsPromise = fetchReservationsByUser(sb, sinceIso);
    const viewPromise = (async () => {
      if (metricsOnly) {
        return { data: null as any[] | null, error: null as { message: string } | null };
      }
      let viewQuery = sb
        .from("analytics_intent_sessions")
        .select(intentSelectWithReason)
        .gte("last_seen_at", sinceIso)
        .order("last_seen_at", { ascending: false })
        .limit(500);
      if (site !== "all") {
        viewQuery = viewQuery.eq("site", site);
      }
      let { data: viewRows, error: viewErr } = await viewQuery;
      if (
        viewErr &&
        /abandon_reason|schema cache|Could not find/i.test(viewErr.message || "")
      ) {
        let legacyQuery = sb
          .from("analytics_intent_sessions")
          .select(intentSelectLegacy)
          .gte("last_seen_at", sinceIso)
          .order("last_seen_at", { ascending: false })
          .limit(500);
        if (site !== "all") {
          legacyQuery = legacyQuery.eq("site", site);
        }
        const legacy = await legacyQuery;
        viewRows = legacy.data;
        viewErr = legacy.error;
      }
      return { data: viewRows, error: viewErr };
    })();

    const [
      {
        rows: cleanEvents,
        truncated: eventsTruncated,
        earliestCoveredDate,
      },
      reservationsByUser,
      viewResult,
    ] = await Promise.all([cleanPromise, reservationsPromise, viewPromise]);

    const events28 = cleanEvents.filter((e) => e.created_at >= since28);
    const metrics28d = computeMetrics28d(events28, reservationsByUser);

    if (metricsOnly) {
      return NextResponse.json({
        days,
        site,
        truncated: eventsTruncated,
        earliestCoveredDate: eventsTruncated ? earliestCoveredDate : null,
        metrics28d,
      });
    }

    let sessions: IntentSessionRow[] = [];
    let usedView = false;
    const viewRows = viewResult.data;
    const viewErr = viewResult.error;

    if (!viewErr && viewRows) {
      usedView = true;
      sessions = viewRows.map((r) => ({
        session_id: r.session_id,
        site: r.site ?? null,
        user_id: r.user_id,
        started_at: r.started_at,
        last_seen_at: r.last_seen_at,
        wines: parseWines(r.wines),
        cart_value: Number(r.cart_value) || 0,
        reached_checkout: !!r.reached_checkout,
        last_checkout_phase: r.last_checkout_phase,
        abandoned_phase: r.abandoned_phase,
        abandon_reason:
          "abandon_reason" in r
            ? ((r as { abandon_reason?: string | null }).abandon_reason ?? null)
            : null,
        last_step: r.last_step,
        last_checkout_error: r.last_checkout_error ?? null,
        is_human: r.is_human ?? null,
      }));
    } else {
      if (viewErr) {
        console.warn(
          "[intent] analytics_intent_sessions unavailable, computing fallback:",
          viewErr.message,
        );
      }
      sessions = buildIntentSessionsFromCleanEvents(
        cleanEvents,
        reservationsByUser,
      );
    }

    const weeklyFunnel = buildWeeklyFunnelFromCleanEvents(
      cleanEvents,
      reservationsByUser,
      Math.max(days, 56),
    ).slice(-8);

    const userIds = [
      ...new Set(sessions.map((s) => s.user_id).filter(Boolean) as string[]),
    ];
    const profilesMap = new Map<
      string,
      { email: string | null; full_name: string | null }
    >();
    if (userIds.length > 0) {
      const { data: profiles } = await sb
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds);
      for (const p of profiles ?? []) {
        profilesMap.set(p.id, {
          email: p.email ?? null,
          full_name: p.full_name ?? null,
        });
      }
    }

    const sessionIdSet = new Set(sessions.slice(0, 200).map((s) => s.session_id));
    const eventsBySession = new Map<string, CleanEventRow[]>();
    for (const e of cleanEvents) {
      if (!sessionIdSet.has(e.session_id)) continue;
      if (!eventsBySession.has(e.session_id)) {
        eventsBySession.set(e.session_id, []);
      }
      eventsBySession.get(e.session_id)!.push(e);
    }

    const enriched = sessions.map((s) => {
      const profile = s.user_id ? profilesMap.get(s.user_id) : null;
      return {
        ...s,
        email: profile?.email ?? null,
        full_name: profile?.full_name ?? null,
        events: (eventsBySession.get(s.session_id) ?? []).map((e) => ({
          event_type: canonicalizeEventType(e.event_type),
          event_metadata: e.event_metadata,
          created_at: e.created_at,
          page_url: e.page_url ?? null,
          site: e.site ?? null,
        })),
      };
    });

    return NextResponse.json({
      days,
      site,
      usedView,
      truncated: eventsTruncated,
      earliestCoveredDate: eventsTruncated ? earliestCoveredDate : null,
      sessions: enriched,
      weeklyFunnel,
      metrics28d,
    });
  } catch (err) {
    console.error("Analytics intent API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch intent analytics" },
      { status: 500 },
    );
  }
}
