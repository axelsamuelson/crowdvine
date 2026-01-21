import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const cookie = request.headers.get("cookie") || "";
    if (!cookie.includes("admin-auth=true")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    if (body?.confirm !== "RESET") {
      return NextResponse.json(
        { error: 'Confirmation required. Send { "confirm": "RESET" }.' },
        { status: 400 },
      );
    }

    const palletId = (await params).id;
    const sb = getSupabaseAdmin();

    // Load pallet zones
    const { data: pallet, error: palletError } = await sb
      .from("pallets")
      .select("id, pickup_zone_id, delivery_zone_id")
      .eq("id", palletId)
      .maybeSingle();

    if (palletError || !pallet) {
      return NextResponse.json({ error: "Pallet not found" }, { status: 404 });
    }

    // Find reservations mapped to this pallet by zones + derived pickup zone (same as GET endpoint)
    const { data: reservations, error: reservationsError } = await sb
      .from("order_reservations")
      .select("id, delivery_zone_id")
      .eq("delivery_zone_id", pallet.delivery_zone_id);

    if (reservationsError) {
      return NextResponse.json({ error: reservationsError.message }, { status: 500 });
    }

    const reservationIds = (reservations || []).map((r: any) => r.id);
    if (reservationIds.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 });
    }

    // Fetch items for these reservations
    const { data: items, error: itemsError } = await sb
      .from("order_reservation_items")
      .select(
        `
        reservation_id,
        wines(
          producers(pickup_zone_id)
        )
      `,
      )
      .in("reservation_id", reservationIds);

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    // Build pickup zone set per reservation
    const pickupZonesByReservation = new Map<string, Set<string>>();
    (items || []).forEach((it: any) => {
      const rid = it.reservation_id as string;
      const pz = it?.wines?.producers?.pickup_zone_id as string | undefined;
      if (!rid || !pz) return;
      const set = pickupZonesByReservation.get(rid) || new Set<string>();
      set.add(pz);
      pickupZonesByReservation.set(rid, set);
    });

    const toDelete = reservationIds.filter((rid) => {
      const set = pickupZonesByReservation.get(rid);
      return set && set.size === 1 && Array.from(set)[0] === pallet.pickup_zone_id;
    });

    if (toDelete.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 });
    }

    // Cascade delete linked rows (best-effort for optional tables)
    await sb.from("reservation_shared_items").delete().in("reservation_id", toDelete);
    await sb.from("reservation_tracking").delete().in("reservation_id", toDelete);

    const { error: delItemsErr } = await sb
      .from("order_reservation_items")
      .delete()
      .in("reservation_id", toDelete);
    if (delItemsErr) {
      return NextResponse.json({ error: delItemsErr.message }, { status: 500 });
    }

    const { error: delResErr } = await sb
      .from("order_reservations")
      .delete()
      .in("id", toDelete);
    if (delResErr) {
      return NextResponse.json({ error: delResErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deleted: toDelete.length });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Internal server error" },
      { status: 500 },
    );
  }
}

