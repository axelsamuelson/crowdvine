import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

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
    .select("id, pickup_zone_id, delivery_zone_id")
    .eq("id", palletId)
    .maybeSingle();

  if (palletError || !pallet) {
    return NextResponse.json({ error: "Pallet not found" }, { status: 404 });
  }

  // Verify reservation exists and belongs to pallet by zone mapping (data-driven)
  const { data: reservation, error: reservationError } = await sb
    .from("order_reservations")
    .select("id, delivery_zone_id")
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

  // Derive pickup zone from items -> wines -> producers.pickup_zone_id
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
  (items || []).forEach((it: any) => {
    const pz = it?.wines?.producers?.pickup_zone_id;
    if (pz) pickupZones.add(pz);
  });

  if (pickupZones.size !== 1 || Array.from(pickupZones)[0] !== pallet.pickup_zone_id) {
    return NextResponse.json(
      { error: "Reservation does not belong to this pallet (pickup zone mismatch)" },
      { status: 400 },
    );
  }

  // Cascade delete reservation-linked rows (we intentionally do not touch bookings)
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

  return NextResponse.json({ success: true });
}

