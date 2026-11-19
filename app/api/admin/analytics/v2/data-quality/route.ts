import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { parseAnalyticsV2Filters } from "@/lib/analytics/v2/filters";
import { ANALYTICS_KNOWN_GAPS } from "@/lib/analytics/v2/known-gaps";
import { fetchStatusLine } from "@/lib/analytics/v2/queries";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const filters = parseAnalyticsV2Filters(request.nextUrl.searchParams);
  const status = await fetchStatusLine(filters);
  const sb = getSupabaseAdmin();

  const { count: allSessions } = await sb
    .from("analytics_session_facts")
    .select("session_id", { count: "exact", head: true })
    .eq("site", filters.site)
    .gte("day_sthlm", filters.from)
    .lte("day_sthlm", filters.to);

  const { count: prerender } = await sb
    .from("analytics_session_facts")
    .select("session_id", { count: "exact", head: true })
    .eq("site", filters.site)
    .gte("day_sthlm", filters.from)
    .lte("day_sthlm", filters.to)
    .eq("is_prerender_suspect", true);

  const { count: clean } = await sb
    .from("analytics_session_facts")
    .select("session_id", { count: "exact", head: true })
    .eq("site", filters.site)
    .gte("day_sthlm", filters.from)
    .lte("day_sthlm", filters.to)
    .eq("is_clean", true)
    .eq("is_prerender_suspect", false);

  const { count: engaged } = await sb
    .from("analytics_session_facts")
    .select("session_id", { count: "exact", head: true })
    .eq("site", filters.site)
    .gte("day_sthlm", filters.from)
    .lte("day_sthlm", filters.to)
    .eq("is_clean", true)
    .eq("is_prerender_suspect", false)
    .eq("is_engaged", true);

  const { count: geoBot } = await sb
    .from("analytics_session_facts")
    .select("session_id", { count: "exact", head: true })
    .eq("site", filters.site)
    .gte("day_sthlm", filters.from)
    .lte("day_sthlm", filters.to)
    .eq("is_geo_bot_suspect", true);

  // Country totals for CN/SG/HK (all sessions in facts) vs heuristic hits
  const geoCountryStats: Array<{
    country: string;
    sessions: number;
    heuristicHits: number;
  }> = [];
  for (const country of ["CN", "SG", "HK"]) {
    const { count: sessions } = await sb
      .from("analytics_session_facts")
      .select("session_id", { count: "exact", head: true })
      .eq("site", filters.site)
      .gte("day_sthlm", filters.from)
      .lte("day_sthlm", filters.to)
      .eq("country_code", country);
    const { count: hits } = await sb
      .from("analytics_session_facts")
      .select("session_id", { count: "exact", head: true })
      .eq("site", filters.site)
      .gte("day_sthlm", filters.from)
      .lte("day_sthlm", filters.to)
      .eq("country_code", country)
      .eq("is_geo_bot_suspect", true);
    geoCountryStats.push({
      country,
      sessions: sessions ?? 0,
      heuristicHits: hits ?? 0,
    });
  }

  const { count: unknownCountry } = await sb
    .from("analytics_session_facts")
    .select("session_id", { count: "exact", head: true })
    .eq("site", filters.site)
    .gte("day_sthlm", filters.from)
    .lte("day_sthlm", filters.to)
    .eq("is_clean", true)
    .is("country_code", null);

  const keyEvents = [
    "page_view",
    "product_list_viewed",
    "product_viewed",
    "add_to_cart",
    "cart_opened",
    "checkout_started",
    "checkout_step_viewed",
    "session_engaged",
  ];

  const eventWatch: Array<{
    eventType: string;
    lastAt: string | null;
    last14Days: number;
    alert: string | null;
  }> = [];

  for (const eventType of keyEvents) {
    const { data: last } = await sb
      .from("user_events")
      .select("created_at")
      .eq("event_type", eventType)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const since = new Date();
    since.setDate(since.getDate() - 14);
    const { count } = await sb
      .from("user_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", eventType)
      .gte("created_at", since.toISOString());

    let alert: string | null = null;
    const lastAt = last?.created_at ?? null;
    if (lastAt) {
      const ageH =
        (Date.now() - new Date(lastAt).getTime()) / (1000 * 60 * 60);
      if (ageH >= 48) alert = "Ovanligt tyst";
    } else {
      alert = "Saknas helt";
    }

    eventWatch.push({
      eventType,
      lastAt,
      last14Days: count ?? 0,
      alert,
    });
  }

  const sessionId = request.nextUrl.searchParams.get("session_id");
  let eventLog: unknown[] = [];
  if (sessionId) {
    const { data } = await sb
      .from("user_events")
      .select(
        "id, created_at, event_type, event_category, page_url, event_metadata, visitor_id",
      )
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(500);
    eventLog = data ?? [];
  }

  const { data: refresh } = await sb
    .from("analytics_refresh_state")
    .select("*")
    .eq("id", "default")
    .maybeSingle();

  return NextResponse.json({
    status,
    ladder: [
      { label: "Alla sessioner i facts", count: allSessions ?? 0 },
      {
        label: "Förhandsladdningar (D1)",
        count: prerender ?? 0,
      },
      {
        label: "Geo-botmisstänkta (CN/SG/HK + beteende)",
        count: geoBot ?? 0,
      },
      { label: "Rena sessioner", count: clean ?? 0 },
      { label: "Varav engagerade", count: engaged ?? 0 },
    ],
    geoBotHeuristic: {
      rule:
        "Land CN, SG eller HK OCH kanal=direkt OCH längd < 1 s OCH högst 2 events OCH inte engagerad. Hela länder stängs inte av.",
      countries: geoCountryStats,
    },
    unknownCountry: unknownCountry ?? 0,
    eventWatch,
    knownGaps: ANALYTICS_KNOWN_GAPS,
    eventLog,
    refresh,
  });
}
