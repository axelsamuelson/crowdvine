import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    full?: boolean;
    since?: string;
  };

  const sb = getSupabaseAdmin();
  const since = body.full ? null : body.since || new Date(Date.now() - 3 * 86400000).toISOString();

  const { data, error } = await sb.rpc("analytics_refresh_session_facts", {
    p_since: since,
  });

  if (error) {
    console.warn("[analytics/v2/refresh]", error.message);
    return NextResponse.json(
      { ok: false, error: "Kunde inte räkna om aggregatet." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, result: data });
}
