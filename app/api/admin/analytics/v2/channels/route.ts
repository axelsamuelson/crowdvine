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
      fetchGroupedDimension("channel", filters),
    ]);
    const rows = grouped.map((r) => ({
      channel: r.key,
      sessions: r.sessions,
      engaged: r.engaged,
      plp: r.plp,
      pdp: r.pdp,
      cart: r.cart,
      checkout: r.checkout,
      purchases: r.purchases,
    }));
    return NextResponse.json({
      status,
      rows,
      notice:
        "utm_medium=paid_social räknas som Kampanj i v2. Sessions-UTM-kolumner (content/term) kommer i nästa del-PR (M3).",
    });
  } catch {
    return NextResponse.json(
      { error: "Kunde inte hämta kanaler" },
      { status: 500 },
    );
  }
}
