import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth-server";
import { buildFinanceOverviewPayload } from "@/lib/finance/service";
import { parseFinanceChannelParam } from "@/lib/finance/channel";
import { parsePeriodKey, resolveFinancePeriod } from "@/lib/finance/period";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/finance/overview
 * Management economics overview (PACT / Dirtywine / All).
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const sp = request.nextUrl.searchParams;
    const channel = parseFinanceChannelParam(sp.get("channel"));
    const periodKey = parsePeriodKey(sp.get("period"));
    const forecastShipQtyRaw = sp.get("forecast_ship_qty");
    const forecastShipQty = forecastShipQtyRaw
      ? Math.max(1, Math.floor(Number(forecastShipQtyRaw) || 0))
      : 240;

    const { start, end } = resolveFinancePeriod({
      key: periodKey,
      customStart: sp.get("start"),
      customEnd: sp.get("end"),
    });

    const payload = await buildFinanceOverviewPayload({
      channel,
      start,
      end,
      forecastShipQty,
    });

    return NextResponse.json({
      channel,
      period: { key: periodKey, start: start.toISOString(), end: end.toISOString() },
      forecastShipQty,
      ...payload,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    const status = msg === "Unauthorized" || msg.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
