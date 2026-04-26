import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/supabase-server";
import { updatePickupProducerForPallet } from "@/lib/pallet-auto-management";
import { autoChargeDeferredReservationsForPallet } from "@/lib/reservation-auto-charge";

const ALLOW_PRE_SHIPPING_STATUSES = new Set(["open", "consolidating"]);

function normalizeStatus(s: string | null | undefined): string {
  return String(s ?? "").toLowerCase().trim();
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminAuth = request.cookies.get("admin-auth")?.value;
  if (adminAuth !== "true") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: palletId } = await params;
  if (!palletId || typeof palletId !== "string") {
    return NextResponse.json({ error: "Missing pallet id" }, { status: 400 });
  }

  const sbAdmin = getSupabaseAdmin();

  try {
    const user = await getCurrentUser();
    const adminUserId = user?.id ?? null;
    console.log(
      `[order-shipping] POST pallet=${palletId} adminUserId=${adminUserId ?? "null"}`,
    );

    const { data: pallet, error: loadErr } = await sbAdmin
      .from("pallets")
      .select("id, status")
      .eq("id", palletId)
      .maybeSingle();

    if (loadErr || !pallet?.id) {
      console.error("[order-shipping] load pallet:", loadErr);
      return NextResponse.json(
        { error: loadErr?.message ?? "Pallet not found" },
        { status: loadErr ? 500 : 404 },
      );
    }

    const st = normalizeStatus(pallet.status as string | null);
    if (!ALLOW_PRE_SHIPPING_STATUSES.has(st)) {
      console.warn(
        `[order-shipping] pallet ${palletId} status=${st} — not eligible`,
      );
      return NextResponse.json(
        { error: "Shipping already ordered for this pallet" },
        { status: 400 },
      );
    }

    console.log(
      `[order-shipping] Final pickup producer recompute before lock pallet=${palletId}`,
    );
    await updatePickupProducerForPallet(palletId);

    const orderedAt = new Date().toISOString();
    const { data: updatedRows, error: updateErr } = await sbAdmin
      .from("pallets")
      .update({
        status: "shipping_ordered",
        shipping_ordered_at: orderedAt,
        shipping_ordered_by: adminUserId,
        updated_at: orderedAt,
      })
      .eq("id", palletId)
      .in("status", ["open", "consolidating"])
      .select("id, status, shipping_ordered_at");

    if (updateErr) {
      console.error("[order-shipping] status update failed:", updateErr);
      return NextResponse.json(
        { error: updateErr.message ?? "Failed to update pallet" },
        { status: 500 },
      );
    }

    const updatedRow = updatedRows?.[0] as
      | { id?: string; shipping_ordered_at?: string | null }
      | undefined;
    if (!updatedRow?.id) {
      console.warn(
        `[order-shipping] concurrent or stale state: no row updated for pallet=${palletId}`,
      );
      return NextResponse.json(
        { error: "Shipping already ordered for this pallet" },
        { status: 400 },
      );
    }

    const shippingOrderedAt = String(
      updatedRow.shipping_ordered_at ?? orderedAt,
    );

    console.log(
      `[order-shipping] Pallet ${palletId} set to shipping_ordered at ${shippingOrderedAt}; starting auto-charge`,
    );

    let reservationsCharged = 0;
    let reservationsFailed = 0;
    try {
      const chargeResult =
        await autoChargeDeferredReservationsForPallet(palletId);
      reservationsCharged = chargeResult.reservationsCharged;
      reservationsFailed = chargeResult.reservationsFailed;
      console.log(
        `[order-shipping] Auto-charge finished pallet=${palletId} charged=${reservationsCharged} failedOrSkipped=${reservationsFailed}`,
      );
    } catch (chargeErr) {
      console.error(
        `[order-shipping] Auto-charge threw for pallet=${palletId} (status already shipping_ordered):`,
        chargeErr,
      );
    }

    return NextResponse.json({
      success: true,
      palletId,
      status: "shipping_ordered",
      shippingOrderedAt,
      reservationsCharged,
      reservationsFailed,
    });
  } catch (e) {
    console.error("[order-shipping] unhandled error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
