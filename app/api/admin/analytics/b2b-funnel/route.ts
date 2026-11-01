import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  B2B_FUNNEL_CONVERSION_EVENT,
  B2B_FUNNEL_SINCE,
  buildB2bWeeklyFunnel,
  type B2bFunnelEventRow,
} from "@/lib/analytics/b2b-funnel";
import { parseSiteParam } from "@/lib/analytics/analytics-site";

const B2B_EVENT_TYPES = [
  "b2b_contact_clicked",
  "b2b_inquiry_started",
  "b2b_inquiry_submitted",
  "b2b_tasting_requested",
  "b2b_quote_sent",
  "b2b_order_created",
] as const;

/**
 * GET /api/admin/analytics/b2b-funnel?site=dirtywine
 * Week-by-week Dirty Wine B2B funnel from 2026-08-07.
 * Conversion = b2b_inquiry_submitted.
 */
export async function GET(request: Request) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const site = parseSiteParam(searchParams.get("site"));
    if (site !== "dirtywine" && site !== "all") {
      return NextResponse.json({
        since: B2B_FUNNEL_SINCE,
        conversionEvent: B2B_FUNNEL_CONVERSION_EVENT,
        weeklyFunnel: [],
        note: "B2B-funneln visas för site=dirtywine.",
      });
    }

    const sb = getSupabaseAdmin();
    const sinceIso = `${B2B_FUNNEL_SINCE}T00:00:00.000Z`;
    const pageSize = 1000;
    const maxRows = 50000;
    const rows: B2bFunnelEventRow[] = [];

    for (let from = 0; from < maxRows; from += pageSize) {
      const { data, error } = await sb
        .from("user_events")
        .select("event_type, event_metadata, created_at, page_url, session_id")
        .eq("event_category", "b2b")
        .in("event_type", [...B2B_EVENT_TYPES])
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) {
        console.error("b2b-funnel query:", error);
        return NextResponse.json(
          { error: "Failed to load B2B funnel", details: error.message },
          { status: 500 },
        );
      }

      const batch = (data ?? []) as B2bFunnelEventRow[];
      rows.push(...batch);
      if (batch.length < pageSize) break;
    }

    let filtered = rows;
    try {
      const clientSessionIds = [
        ...new Set(
          rows
            .filter(
              (r) => r.session_id && !String(r.session_id).startsWith("server_"),
            )
            .map((r) => r.session_id as string),
        ),
      ];
      if (clientSessionIds.length > 0) {
        const botSessions = new Set<string>();
        for (let i = 0; i < clientSessionIds.length; i += 500) {
          const chunk = clientSessionIds.slice(i, i + 500);
          const { data, error } = await sb
            .from("analytics_known_bot_sessions")
            .select("session_id")
            .in("session_id", chunk);
          if (error) {
            // View may not be migrated yet — skip bot filter.
            console.warn("b2b-funnel bot view:", error.message);
            break;
          }
          for (const row of data ?? []) {
            if (row?.session_id) botSessions.add(row.session_id);
          }
        }
        if (botSessions.size > 0) {
          filtered = rows.filter(
            (r) =>
              !r.session_id ||
              String(r.session_id).startsWith("server_") ||
              !botSessions.has(r.session_id),
          );
        }
      }
    } catch (e) {
      console.warn("b2b-funnel bot filter skipped:", e);
    }

    const weeklyFunnel = buildB2bWeeklyFunnel(filtered);

    return NextResponse.json({
      since: B2B_FUNNEL_SINCE,
      conversionEvent: B2B_FUNNEL_CONVERSION_EVENT,
      weeklyFunnel,
      eventCount: filtered.length,
    });
  } catch (e) {
    console.error("b2b-funnel:", e);
    return NextResponse.json(
      { error: "Failed to load B2B funnel" },
      { status: 500 },
    );
  }
}
