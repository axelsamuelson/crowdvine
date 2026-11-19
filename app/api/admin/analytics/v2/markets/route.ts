import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { parseAnalyticsV2Filters } from "@/lib/analytics/v2/filters";
import {
  fetchGroupedDimension,
  fetchStatusLine,
} from "@/lib/analytics/v2/queries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const filters = parseAnalyticsV2Filters(request.nextUrl.searchParams);
  try {
    const [status, grouped] = await Promise.all([
      fetchStatusLine(filters),
      fetchGroupedDimension("market", filters),
    ]);
    const rows = grouped.map((r) => ({
      market: r.key,
      sessions: r.sessions,
      engaged: r.engaged,
      plp: r.plp,
      pdp: r.pdp,
      cart: r.cart,
      checkout: r.checkout,
    }));
    return NextResponse.json({ status, rows });
  } catch {
    return NextResponse.json(
      { error: "Kunde inte hämta marknader" },
      { status: 500 },
    );
  }
}
