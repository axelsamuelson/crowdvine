import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  FINANCE_FULFILLMENT_COSTS_ID,
  defaultFinanceFulfillmentCosts,
  financeFulfillmentCostsToRow,
  parseFinanceFulfillmentCostsBody,
  rowToFinanceFulfillmentCosts,
  type FinanceFulfillmentCostsRow,
} from "@/lib/finance/fulfillment-costs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("finance_fulfillment_costs")
      .select("*")
      .eq("id", FINANCE_FULFILLMENT_COSTS_ID)
      .maybeSingle();

    if (error) {
      // Table may not exist yet — fall back to defaults.
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        return NextResponse.json({
          costs: defaultFinanceFulfillmentCosts(),
          source: "defaults",
        });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      costs: rowToFinanceFulfillmentCosts(
        data as FinanceFulfillmentCostsRow | null,
      ),
      source: data ? "database" : "defaults",
      updatedAt: data?.updated_at ?? null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const costs = parseFinanceFulfillmentCostsBody(body?.costs ?? body);
    const row = financeFulfillmentCostsToRow(costs);
    const sb = getSupabaseAdmin();

    const { data, error } = await sb
      .from("finance_fulfillment_costs")
      .upsert(
        {
          id: FINANCE_FULFILLMENT_COSTS_ID,
          ...row,
          updated_at: new Date().toISOString(),
          updated_by: admin.id,
        },
        { onConflict: "id" },
      )
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      costs: rowToFinanceFulfillmentCosts(
        data as FinanceFulfillmentCostsRow,
      ),
      source: "database",
      updatedAt: data?.updated_at ?? null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}
