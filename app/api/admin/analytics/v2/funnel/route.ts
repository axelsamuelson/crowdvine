import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { parseAnalyticsV2Filters } from "@/lib/analytics/v2/filters";
import {
  applyCleanFactsFilters,
  fetchSessionFunnel,
  fetchStatusLine,
} from "@/lib/analytics/v2/queries";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { CHECKOUT_STEP_ORDER } from "@/lib/analytics/v2/checkout-step";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const filters = parseAnalyticsV2Filters(request.nextUrl.searchParams);
  const [status, funnel] = await Promise.all([
    fetchStatusLine(filters),
    fetchSessionFunnel(filters),
  ]);

  const sb = getSupabaseAdmin();
  let checkoutSteps: Array<{ step: string; count: number }> = [];
  let abandonReasons: Array<{ reason: string; count: number }> = [];
  let voices: unknown[] = [];
  let nearPurchase: unknown[] = [];

  {
    const { data } = await applyCleanFactsFilters(
      sb
        .from("analytics_session_facts")
        .select("last_checkout_step, abandon_reason"),
      filters,
    )
      .eq("reached_checkout", true)
      .limit(2000);

    const stepCounts = new Map<string, number>();
    const reasonCounts = new Map<string, number>();
    for (const row of data ?? []) {
      const step = (row.last_checkout_step as string) || "unknown";
      stepCounts.set(step, (stepCounts.get(step) || 0) + 1);
      if (row.abandon_reason) {
        const r = String(row.abandon_reason);
        reasonCounts.set(r, (reasonCounts.get(r) || 0) + 1);
      }
    }
    checkoutSteps = [
      ...CHECKOUT_STEP_ORDER.map((step) => ({
        step,
        count: stepCounts.get(step) || 0,
      })),
      ...(stepCounts.has("unknown")
        ? [{ step: "unknown", count: stepCounts.get("unknown") || 0 }]
        : []),
    ];
    abandonReasons = [...reasonCounts.entries()].map(([reason, count]) => ({
      reason,
      count,
    }));
  }

  {
    const { data } = await applyCleanFactsFilters(
      sb
        .from("analytics_session_facts")
        .select(
          "session_id, started_at, channel, device, country_code, last_checkout_step, abandon_reason, is_invited_friend, purchase_value_sek, added_to_cart, reached_checkout",
        ),
      filters,
    )
      .or("added_to_cart.eq.true,reached_checkout.eq.true")
      .eq("purchased", false)
      .order("started_at", { ascending: false })
      .limit(100);
    nearPurchase = data ?? [];
  }

  {
    const { data, error } = await sb
      .from("exit_feedback")
      .select("id, created_at, step, page, answer, reason, is_internal")
      .order("created_at", { ascending: false })
      .limit(100);
    if (!error) {
      voices = (data ?? []).filter((r) => r.is_internal !== true);
    }
  }

  return NextResponse.json({
    status,
    funnel: funnel.steps,
    checkoutSteps,
    abandonReasons,
    nearPurchase,
    voices,
  });
}
