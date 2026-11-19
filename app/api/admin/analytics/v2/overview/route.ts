import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import {
  parseAnalyticsV2Filters,
  previousPeriod,
} from "@/lib/analytics/v2/filters";
import {
  applyCleanFactsFilters,
  fetchAnnotations,
  fetchRollupTotals,
  fetchSessionFunnel,
  fetchStatusLine,
  fetchTimeSeries,
} from "@/lib/analytics/v2/queries";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const filters = parseAnalyticsV2Filters(request.nextUrl.searchParams);
  const [status, funnel, series, annotationsResult] = await Promise.all([
    fetchStatusLine(filters),
    fetchSessionFunnel(filters),
    fetchTimeSeries(filters),
    fetchAnnotations(filters.from, filters.to),
  ]);

  let previous = null;
  if (filters.compare !== "none") {
    const prev =
      filters.compare === "mom"
        ? (() => {
            const shift = (key: string) => {
              const [y, m, d] = key.split("-").map(Number);
              const dt = new Date(Date.UTC(y, m - 1, d));
              dt.setUTCMonth(dt.getUTCMonth() - 1);
              return dt.toISOString().slice(0, 10);
            };
            return { from: shift(filters.from), to: shift(filters.to) };
          })()
        : previousPeriod(filters.from, filters.to);
    previous = await fetchRollupTotals({ ...filters, ...prev });
  }

  const sb = getSupabaseAdmin();
  const { data: fulfillmentRows } = await applyCleanFactsFilters(
    sb
      .from("analytics_session_facts")
      .select("fulfillment_channel, purchase_value_sek"),
    filters,
  )
    .eq("purchased", true)
    .limit(500);

  // Sessions that reached PLP or PDP (union approx via facts)
  const { count: plpOrPdp } = await applyCleanFactsFilters(
    sb.from("analytics_session_facts").select("session_id", {
      count: "exact",
      head: true,
    }),
    filters,
  ).or("reached_plp.eq.true,reached_pdp.eq.true");

  const fulfillmentMap = new Map<string, { count: number; valueSek: number }>();
  for (const row of fulfillmentRows ?? []) {
    const key = (row.fulfillment_channel as string) || "shared_pallet";
    const cur = fulfillmentMap.get(key) || { count: 0, valueSek: 0 };
    cur.count += 1;
    cur.valueSek += Number(row.purchase_value_sek || 0);
    fulfillmentMap.set(key, cur);
  }

  return NextResponse.json({
    status,
    current: {
      ...funnel.totals,
      plpOrPdp: plpOrPdp ?? Math.max(funnel.totals.plp, funnel.totals.pdp),
    },
    previous,
    funnel: funnel.steps,
    series,
    fulfillment: [...fulfillmentMap.entries()].map(([channel, v]) => ({
      channel,
      ...v,
    })),
    annotations: annotationsResult.annotations.slice(0, 8).map((a) => ({
      id: a.id,
      date: a.date,
      label: a.label,
      category: a.category,
    })),
    annotationsError: annotationsResult.error,
    purchaseLinkApproximate: true as const,
  });
}
