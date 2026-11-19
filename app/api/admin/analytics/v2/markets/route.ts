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
    .select("market, sessions, engaged, plp, pdp, cart, checkout")
    .eq("site", filters.site)
    .gte("day_sthlm", filters.from)
    .lte("day_sthlm", filters.to);
  if (filters.invited === "exclude") q = q.eq("is_invited_friend", false);
  if (filters.channel) q = q.eq("channel", filters.channel);
  if (filters.device) q = q.eq("device", filters.device);

  const { data, error } = await q.limit(2000);
  if (error) {
    return NextResponse.json({ error: "Kunde inte hämta marknader" }, { status: 500 });
  }

  const byMarket = new Map<
    string,
    { sessions: number; engaged: number; plp: number; pdp: number; cart: number; checkout: number }
  >();
  for (const row of data ?? []) {
    const m = (row.market as string) || "unknown";
    const cur = byMarket.get(m) || {
      sessions: 0,
      engaged: 0,
      plp: 0,
      pdp: 0,
      cart: 0,
      checkout: 0,
    };
    cur.sessions += Number(row.sessions || 0);
    cur.engaged += Number(row.engaged || 0);
    cur.plp += Number(row.plp || 0);
    cur.pdp += Number(row.pdp || 0);
    cur.cart += Number(row.cart || 0);
    cur.checkout += Number(row.checkout || 0);
    byMarket.set(m, cur);
  }

  return NextResponse.json({
    status,
    rows: [...byMarket.entries()].map(([market, v]) => ({ market, ...v })),
  });
}
