import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Vercel Cron: refresh analytics session facts.
 * - Every 15 minutes: incremental (last ~1 day window via null-safe since)
 * - Nightly 02:30 UTC (= 03:30 Europe/Stockholm winter): full rebuild last 3 days
 * Secured by CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization");
    const secret = process.env.CRON_SECRET;
    if (!secret || auth !== `Bearer ${secret}`) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 200 },
      );
    }

    const mode = request.nextUrl.searchParams.get("mode"); // full | recent
    const sb = getSupabaseAdmin();

    let p_since: string | null;
    if (mode === "full") {
      // Rebuild last 3 days thoroughly
      p_since = new Date(Date.now() - 3 * 86400000).toISOString();
    } else if (mode === "backfill") {
      p_since = null; // full from 2026-08-07
    } else {
      p_since = new Date(Date.now() - 26 * 3600000).toISOString();
    }

    const { data, error } = await sb.rpc("analytics_refresh_session_facts", {
      p_since,
    });

    if (error) {
      console.error("[cron/analytics-refresh]", error.message);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 200 },
      );
    }

    // Soft-flag CN/SG/HK geo-bot suspects (v1.2). Never DELETE.
    const { data: geo, error: geoError } = await sb.rpc(
      "analytics_apply_geo_bot_flags",
    );
    if (geoError) {
      console.error("[cron/analytics-refresh] geo-bot", geoError.message);
    }

    return NextResponse.json(
      { success: true, result: data, geoBot: geo ?? null, geoError: geoError?.message ?? null },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/analytics-refresh]", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 200 },
    );
  }
}
