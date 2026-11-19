import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { parseAnalyticsV2Filters } from "@/lib/analytics/v2/filters";
import { fetchProductsReport, fetchStatusLine } from "@/lib/analytics/v2/queries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const filters = parseAnalyticsV2Filters(request.nextUrl.searchParams);
  try {
    const [status, report] = await Promise.all([
      fetchStatusLine(filters),
      fetchProductsReport(filters),
    ]);
    return NextResponse.json({
      status,
      wines: report.wines.slice(0, 50),
      lists: report.lists.slice(0, 20),
      unattributedPdp: report.unattributedPdp,
    });
  } catch {
    return NextResponse.json(
      { error: "Kunde inte hämta produkter" },
      { status: 500 },
    );
  }
}
