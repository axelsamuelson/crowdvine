import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("finance_opex_entries")
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

    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "name required" }, { status: 400 });
    }

    const amountCents = Math.max(0, Math.round(Number(body.amount_cents) || 0));
    const cadence = body.cadence;
    const channel = body.channel;
    if (!["monthly", "annual", "one_off"].includes(cadence)) {
      return NextResponse.json({ error: "invalid cadence" }, { status: 400 });
    }
    if (!["pact", "dirtywine", "shared"].includes(channel)) {
      return NextResponse.json({ error: "invalid channel" }, { status: 400 });
    }

    const { data, error } = await sb
      .from("finance_opex_entries")
      .insert({
        name,
        category: String(body.category || "other"),
        amount_cents: amountCents,
        currency: "SEK",
        cadence,
        channel,
        shared_pact_percent:
          channel === "shared" && body.shared_pact_percent != null
            ? Number(body.shared_pact_percent)
            : null,
        starts_on: String(body.starts_on || new Date().toISOString().slice(0, 10)),
        ends_on: body.ends_on || null,
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
