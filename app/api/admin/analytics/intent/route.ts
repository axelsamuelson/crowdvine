import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import {
  buildIntentSessionsFromCleanEvents,
  buildWeeklyFunnelFromCleanEvents,
  type CleanEventRow,
  type IntentSessionRow,
  type IntentWine,
} from "@/lib/analytics/intent-sessions";
import {
  dominantSessionSite,
  parseSiteParam,
  type AnalyticsSiteFilter,
} from "@/lib/analytics/analytics-site";

async function fetchCleanEvents(
  sb: ReturnType<typeof getSupabaseAdmin>,
  sinceIso: string,
  site: AnalyticsSiteFilter,
): Promise<{ rows: CleanEventRow[]; fromCleanView: boolean }> {
  const pageSize = 1000;
  const maxRows = 30000;
  const selectCols =
    "session_id, user_id, event_type, event_metadata, created_at, page_url, site";

  async function paged(table: string, extra?: (q: any) => any) {
    const out: CleanEventRow[] = [];
    for (let from = 0; from < maxRows; from += pageSize) {
      let q = sb
        .from(table)
        .select(
          table === "user_events"
            ? "session_id, user_id, event_type, event_metadata, created_at, page_url"
            : selectCols,
        )
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: true })
        .range(from, from + pageSize - 1);
      if (extra) q = extra(q);
      const { data, error } = await q;
      if (error) return { rows: out, error };
      const batch = (data ?? []) as CleanEventRow[];
      out.push(...batch);
      if (batch.length < pageSize) break;
    }
    return { rows: out, error: null as null };
  }

  const clean = await paged(
    "analytics_sessions_clean",
    site === "all" ? undefined : (q) => q.eq("site", site),
  );
  if (!clean.error) {
    return { rows: clean.rows, fromCleanView: true };
  }

  console.warn(
    "[intent] analytics_sessions_clean unavailable:",
    clean.error.message,
  );
  const fallback = await paged("user_events", (q) =>
    q.not("session_id", "like", "server_%"),
  );
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

  return { rows, fromCleanView: false };
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

  const sb = getSupabaseAdmin();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const sinceIso = since.toISOString();
  const since28 = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const { rows: cleanEvents } = await fetchCleanEvents(sb, sinceIso, site);
    const reservationsByUser = await fetchReservationsByUser(sb, sinceIso);

    let sessions: IntentSessionRow[] = [];
    let usedView = false;

    let viewQuery = sb
      .from("analytics_intent_sessions")
      .select(
        "session_id, site, user_id, started_at, last_seen_at, wines, cart_value, reached_checkout, last_checkout_phase, abandoned_phase, last_step",
      )
      .gte("last_seen_at", sinceIso)
      .order("last_seen_at", { ascending: false })
      .limit(500);
    if (site !== "all") {
      viewQuery = viewQuery.eq("site", site);
    }

    const { data: viewRows, error: viewErr } = await viewQuery;

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
        last_step: r.last_step,
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

    const sessionIds = sessions.slice(0, 200).map((s) => s.session_id);
    const eventsBySession = new Map<string, CleanEventRow[]>();
    for (const e of cleanEvents) {
      if (!sessionIds.includes(e.session_id)) continue;
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
          event_type: e.event_type,
          event_metadata: e.event_metadata,
          created_at: e.created_at,
          page_url: e.page_url ?? null,
          site: e.site ?? null,
        })),
      };
    });

    const events28 = cleanEvents.filter((e) => e.created_at >= since28);
    const visitorSessions = new Set(events28.map((e) => e.session_id));
    const intent28 = buildIntentSessionsFromCleanEvents(
      events28,
      reservationsByUser,
    );
    const reservationSessions = new Set<string>();
    const sessionAgg = new Map<
      string,
      { minAt: number; maxAt: number; userIds: Set<string>; types: Set<string> }
    >();
    for (const e of events28) {
      let a = sessionAgg.get(e.session_id);
      if (!a) {
        a = {
          minAt: new Date(e.created_at).getTime(),
          maxAt: new Date(e.created_at).getTime(),
          userIds: new Set(),
          types: new Set(),
        };
        sessionAgg.set(e.session_id, a);
      }
      const t = new Date(e.created_at).getTime();
      if (t < a.minAt) a.minAt = t;
      if (t > a.maxAt) a.maxAt = t;
      if (e.user_id) a.userIds.add(e.user_id);
      a.types.add(e.event_type);
    }
    for (const [sid, a] of sessionAgg) {
      if (a.types.has("reservation_completed")) {
        reservationSessions.add(sid);
        continue;
      }
      for (const uid of a.userIds) {
        const dates = reservationsByUser.get(uid) ?? [];
        if (
          dates.some((iso) => {
            const t = new Date(iso).getTime();
            return t >= a.minAt && t <= a.maxAt + 24 * 60 * 60 * 1000;
          })
        ) {
          reservationSessions.add(sid);
          break;
        }
      }
    }

    const visitors = visitorSessions.size;
    const reservations = reservationSessions.size;
    const conversion_pct =
      visitors > 0
        ? Math.round((reservations / visitors) * 1000) / 10
        : 0;

    return NextResponse.json({
      days,
      site,
      usedView,
      sessions: enriched,
      weeklyFunnel,
      metrics28d: {
        visitors,
        intent_sessions: intent28.length,
        reservations,
        conversion_pct,
      },
    });
  } catch (err) {
    console.error("Analytics intent API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch intent analytics" },
      { status: 500 },
    );
  }
}
