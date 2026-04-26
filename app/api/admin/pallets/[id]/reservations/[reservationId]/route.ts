import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  cleanupEmptyPalletsAfterReservationChange,
  releaseBookingsForReservationPallet,
  updatePickupProducerForPallet,
} from "@/lib/pallet-auto-management";

async function assertAdmin(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  if (!cookie.includes("admin-auth=true")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; reservationId: string }> },
) {
  const unauthorized = await assertAdmin(request);
  if (unauthorized) return unauthorized;

  const { id: palletId, reservationId } = await params;
  const sb = getSupabaseAdmin();

  // Verify pallet exists and load zones
  const { data: pallet, error: palletError } = await sb
    .from("pallets")
    .select("id, pickup_zone_id, delivery_zone_id, shipping_region_id")
    .eq("id", palletId)
    .maybeSingle();

  if (palletError || !pallet) {
    return NextResponse.json({ error: "Pallet not found" }, { status: 404 });
  }

  const { data: reservation, error: reservationError } = await sb
    .from("order_reservations")
    .select(
      "id, delivery_zone_id, pallet_id, shipping_region_id",
    )
    .eq("id", reservationId)
    .maybeSingle();

  if (reservationError) {
    return NextResponse.json({ error: reservationError.message }, { status: 500 });
  }
  if (!reservation) {
    return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
  }
  if (reservation.delivery_zone_id !== pallet.delivery_zone_id) {
    return NextResponse.json(
      { error: "Reservation does not belong to this pallet" },
      { status: 400 },
    );
  }

  const resPalletId = reservation.pallet_id as string | null | undefined;
  const belongsByPalletId =
    typeof resPalletId === "string" && resPalletId === palletId;

  if (!belongsByPalletId) {
    const { data: items, error: itemsError } = await sb
      .from("order_reservation_items")
      .select(
        `
        item_id,
        wines(
          producer_id,
          producers(pickup_zone_id)
        )
      `,
      )
      .eq("reservation_id", reservationId);

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    const pickupZones = new Set<string>();
    type ItemRow = {
      wines?: { producers?: { pickup_zone_id?: string | null } | null } | null;
    };
    (items ?? []).forEach((it: ItemRow) => {
      const pz = it?.wines?.producers?.pickup_zone_id;
      if (pz) pickupZones.add(pz);
    });

    const palletPickup = pallet.pickup_zone_id as string | null | undefined;
    if (
      pickupZones.size !== 1 ||
      !palletPickup ||
      Array.from(pickupZones)[0] !== palletPickup
    ) {
      return NextResponse.json(
        {
          error:
            "Reservation does not belong to this pallet (link or pickup zone mismatch)",
        },
        { status: 400 },
      );
    }
  }

  const cleanupSnapshot = {
    pallet_id: (reservation.pallet_id as string | null) ?? null,
    delivery_zone_id: (reservation.delivery_zone_id as string | null) ?? null,
    shipping_region_id:
      (reservation.shipping_region_id as string | null) ?? null,
  };

  await releaseBookingsForReservationPallet(
    reservationId,
    cleanupSnapshot.pallet_id,
  );

  // Cascade delete reservation-linked rows
  const { error: sharedError } = await sb
    .from("reservation_shared_items")
    .delete()
    .eq("reservation_id", reservationId);
  if (sharedError) {
    // Not all DBs have this table; ignore missing table errors
    console.warn("[Admin] Failed to delete reservation_shared_items:", sharedError.message);
  }

  const { error: trackingError } = await sb
    .from("reservation_tracking")
    .delete()
    .eq("reservation_id", reservationId);
  if (trackingError) {
    console.warn("[Admin] Failed to delete reservation_tracking:", trackingError.message);
  }

  const { error: itemDelError } = await sb
    .from("order_reservation_items")
    .delete()
    .eq("reservation_id", reservationId);
  if (itemDelError) {
    return NextResponse.json({ error: itemDelError.message }, { status: 500 });
  }

  const { error: resDelError } = await sb
    .from("order_reservations")
    .delete()
    .eq("id", reservationId);
  if (resDelError) {
    return NextResponse.json({ error: resDelError.message }, { status: 500 });
  }

  await cleanupEmptyPalletsAfterReservationChange(cleanupSnapshot);

  if (cleanupSnapshot.pallet_id) {
    await updatePickupProducerForPallet(cleanupSnapshot.pallet_id);
  }

  return NextResponse.json({ success: true });
}

