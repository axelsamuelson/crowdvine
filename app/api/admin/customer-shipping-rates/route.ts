import { NextRequest, NextResponse } from "next/server";
import { listCustomerShippingRates } from "@/lib/admin/lager-frakt-reads";
import { createCustomerShippingRate } from "@/lib/admin/lager-frakt-writes";
import { requireAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

/**
 * Customer shipping REVENUE rates (not carrier cost, not inbound freight).
 * GET/POST /api/admin/customer-shipping-rates
 */
export async function GET() {
  try {
    await requireAdmin();
    const entries = await listCustomerShippingRates(getSupabaseAdmin());
    return NextResponse.json({ entries });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    if (msg.includes("42P01") || msg.includes("does not exist")) {
      return NextResponse.json({ error: msg, entries: [] }, { status: 200 });
    }
    const status = msg === "Admin authentication required" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const result = await createCustomerShippingRate(
      getSupabaseAdmin(),
      body,
      admin.id,
    );
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    if (msg === "Admin authentication required") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    if (msg.includes("flat_fee_cents") || msg.includes("free_shipping")) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
