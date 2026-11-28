import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { computeSharedPalletChargeDeadlineIso } from "@/lib/checkout/shared-pallet-deadline";
import { PALLET_ACCEPTING_STATUSES } from "@/lib/pallet-ship-progress";

/**
 * Public read-only charge/close deadline for the Delad pall card.
 * Guests have no session until after address — offer-quotes 401s — so the
 * card paints stängning/leveranstid from this + /zones fill instead.
 * Only accepting pallets; no PII; same formula as offer-quotes.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const palletId = String(url.searchParams.get("pallet_id") ?? "").trim();
    if (!palletId) {
      return NextResponse.json({ error: "pallet_id_required" }, { status: 400 });
    }

    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("pallets")
      .select("id, created_at, status")
      .eq("id", palletId)
      .maybeSingle();

    if (error) {
      console.error("[pallet-charge-deadline]", error.message);
      return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
    }
    if (!data?.id) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const status = String(data.status ?? "").toLowerCase();
    if (
      !(PALLET_ACCEPTING_STATUSES as readonly string[]).includes(status)
    ) {
      return NextResponse.json({ error: "not_accepting" }, { status: 404 });
    }

    const createdAt =
      typeof data.created_at === "string" ? data.created_at : null;
    const charge_deadline_at =
      computeSharedPalletChargeDeadlineIso(createdAt);

    return NextResponse.json(
      { charge_deadline_at },
      {
        headers: {
          // Short private cache — deadline is stable per pallet open window.
          "Cache-Control": "private, max-age=60",
        },
      },
    );
  } catch (err) {
    console.error("[pallet-charge-deadline]", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
