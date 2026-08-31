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
    if (body.name != null) patch.name = String(body.name).trim();
    if (body.category != null) patch.category = String(body.category);
    if (body.amount_cents != null) {
      patch.amount_cents = Math.max(0, Math.round(Number(body.amount_cents) || 0));
    }
    if (body.cadence != null) patch.cadence = body.cadence;
    if (body.channel != null) patch.channel = body.channel;
    if (body.shared_pact_percent !== undefined) {
      patch.shared_pact_percent =
        body.shared_pact_percent == null ? null : Number(body.shared_pact_percent);
    }
    if (body.starts_on != null) patch.starts_on = body.starts_on;
    if (body.ends_on !== undefined) patch.ends_on = body.ends_on;
    if (body.active != null) patch.active = Boolean(body.active);
    if (body.notes !== undefined) patch.notes = body.notes;

    const { data, error } = await sb
      .from("finance_opex_entries")
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
