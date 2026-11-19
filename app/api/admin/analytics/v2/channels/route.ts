import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { parseAnalyticsV2Filters } from "@/lib/analytics/v2/filters";
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

  let q = sb
    .from("analytics_daily_rollup")
    .select(
      "channel, sessions, engaged, plp, pdp, cart, checkout, purchases, day_sthlm",
    )
    .eq("site", filters.site)
    .gte("day_sthlm", filters.from)
    .lte("day_sthlm", filters.to);
  if (filters.invited === "exclude") q = q.eq("is_invited_friend", false);
  if (filters.device) q = q.eq("device", filters.device);
  if (filters.market === "SE" || filters.market === "other" || filters.market === "unknown") {
    q = q.eq("market", filters.market);
  }

  const { data, error } = await q.limit(2000);
  if (error) {
    return NextResponse.json({ error: "Kunde inte hämta kanaler" }, { status: 500 });
  }

  const byChannel = new Map<
    string,
    {
      sessions: number;
      engaged: number;
      plp: number;
      pdp: number;
      cart: number;
      checkout: number;
      purchases: number;
    }
  >();
  for (const row of data ?? []) {
    const ch = (row.channel as string) || "direct";
    const cur = byChannel.get(ch) || {
      sessions: 0,
      engaged: 0,
      plp: 0,
      pdp: 0,
      cart: 0,
      checkout: 0,
      purchases: 0,
    };
    cur.sessions += Number(row.sessions || 0);
    cur.engaged += Number(row.engaged || 0);
    cur.plp += Number(row.plp || 0);
    cur.pdp += Number(row.pdp || 0);
    cur.cart += Number(row.cart || 0);
    cur.checkout += Number(row.checkout || 0);
    cur.purchases += Number(row.purchases || 0);
    byChannel.set(ch, cur);
  }

  const rows = [...byChannel.entries()]
    .map(([channel, v]) => ({ channel, ...v }))
    .sort((a, b) => b.sessions - a.sessions);

  return NextResponse.json({
    status,
    rows,
    notice:
      "Kampanjtrafik kan klassas som Direkt eller Hänvisning tills UTM first-touch är rättat.",
  });
}
