import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const sb = getSupabaseAdmin();

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (body.flat_fee_cents != null) {
      patch.flat_fee_cents = Math.max(0, Math.round(Number(body.flat_fee_cents) || 0));
    }
    if (body.free_shipping != null) patch.free_shipping = Boolean(body.free_shipping);
    if (body.free_shipping_threshold_cents !== undefined) {
      patch.free_shipping_threshold_cents =
        body.free_shipping_threshold_cents == null
          ? null
          : Math.round(Number(body.free_shipping_threshold_cents));
    }
    if (body.country_code !== undefined) patch.country_code = body.country_code;
    if (body.active != null) patch.active = Boolean(body.active);
    if (body.notes !== undefined) patch.notes = body.notes;

    const { data, error } = await sb
      .from("customer_shipping_rates")
      .update(patch)
      .eq("id", id)
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
