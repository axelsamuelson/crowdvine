import { NextRequest, NextResponse } from "next/server";
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
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("customer_shipping_rates")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      return NextResponse.json(
        { error: error.message, entries: [] },
        { status: error.code === "42P01" ? 200 : 500 },
      );
    }
    return NextResponse.json({ entries: data ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const sb = getSupabaseAdmin();

    const flat = Math.max(0, Math.round(Number(body.flat_fee_cents) || 0));
    const free = body.free_shipping === true;
    if (!free && flat <= 0) {
      return NextResponse.json(
        {
          error:
            "Set flat_fee_cents > 0 or free_shipping=true. Do not invent a commercial rate without a business decision.",
        },
        { status: 400 },
      );
    }

    const { data, error } = await sb
      .from("customer_shipping_rates")
      .insert({
        channel: "pact",
        country_code: body.country_code ?? "SE",
        flat_fee_cents: free ? 0 : flat,
        free_shipping: free,
        free_shipping_threshold_cents:
          body.free_shipping_threshold_cents == null
            ? null
            : Math.round(Number(body.free_shipping_threshold_cents)),
        min_bottles: body.min_bottles ?? null,
        max_bottles: body.max_bottles ?? null,
        active: body.active !== false,
        notes: body.notes ?? null,
        created_by: admin.id,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ entry: data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}
