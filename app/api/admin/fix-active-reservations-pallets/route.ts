import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Fix active reservations so they point to the correct pickup_zone_id + pallet_id
 * based on the wines inside each reservation.
 *
 * Why this exists:
 * - `/api/user/reservations` prefers `reservation.pallet_id` if present.
 * - If producers (pickup zones) change later, old reservations can continue to show
 *   multiple pallets or "Unassigned Pallet" until reservations are migrated.
 */
export async function POST(req: NextRequest) {
  try {
    const adminAuth = req.cookies.get("admin-auth")?.value;
    if (adminAuth !== "true") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sb = getSupabaseAdmin();
    const activeStatuses = ["placed", "approved", "partly_approved", "pending_payment", "confirmed"];

    const { data: reservations, error: resErr } = await sb
      .from("order_reservations")
      .select("id, status, pickup_zone_id, delivery_zone_id, pallet_id")
      .in("status", activeStatuses);

    if (resErr) throw resErr;

    const reservationIds = (reservations || []).map((r: any) => r.id);
    if (reservationIds.length === 0) {
      return NextResponse.json({ success: true, updated: 0, skipped: 0 });
    }

    // Load all items for these reservations
    const { data: items, error: itemsErr } = await sb
      .from("order_reservation_items")
      .select("reservation_id, item_id")
      .in("reservation_id", reservationIds);
    if (itemsErr) throw itemsErr;

    // Map reservation -> wineIds
    const wineIdsByReservation = new Map<string, string[]>();
    for (const it of items || []) {
      const arr = wineIdsByReservation.get(it.reservation_id) || [];
      arr.push(it.item_id);
      wineIdsByReservation.set(it.reservation_id, arr);
    }

    // Load producer_id for all wine IDs we saw
    const allWineIds = Array.from(
      new Set(
        (items || [])
          .map((i: any) => i.item_id)
          .filter((id: any) => typeof id === "string" && id.length > 0),
      ),
    );

    const producerIdByWineId = new Map<string, string>();
    if (allWineIds.length > 0) {
      const { data: wines, error: winesErr } = await sb
        .from("wines")
        .select("id, producer_id")
        .in("id", allWineIds);
      if (winesErr) throw winesErr;
      (wines || []).forEach((w: any) => {
        if (w?.id && w?.producer_id) producerIdByWineId.set(w.id, w.producer_id);
      });
    }

    // Load pickup_zone_id for all producers
    const allProducerIds = Array.from(new Set(Array.from(producerIdByWineId.values())));
    const pickupZoneIdByProducerId = new Map<string, string | null>();
    if (allProducerIds.length > 0) {
      const { data: producers, error: prodErr } = await sb
        .from("producers")
        .select("id, pickup_zone_id")
        .in("id", allProducerIds);
      if (prodErr) throw prodErr;
      (producers || []).forEach((p: any) =>
        pickupZoneIdByProducerId.set(p.id, p.pickup_zone_id || null),
      );
    }

    let updated = 0;
    let skipped = 0;
    const skippedReasons: Record<string, number> = {};

    for (const r of reservations || []) {
      const wineIds = wineIdsByReservation.get(r.id) || [];
      const pickupZones = new Set<string>();

      for (const wineId of wineIds) {
        const producerId = producerIdByWineId.get(wineId);
        if (!producerId) continue;
        const pz = pickupZoneIdByProducerId.get(producerId);
        if (pz) pickupZones.add(pz);
      }

      if (pickupZones.size === 0) {
        skipped++;
        skippedReasons.no_pickup_zone = (skippedReasons.no_pickup_zone || 0) + 1;
        continue;
      }

      if (pickupZones.size > 1) {
        skipped++;
        skippedReasons.multiple_pickup_zones =
          (skippedReasons.multiple_pickup_zones || 0) + 1;
        continue;
      }

      const desiredPickupZoneId = Array.from(pickupZones)[0];
      const deliveryZoneId = r.delivery_zone_id || null;

      // Find matching pallet (optional)
      let desiredPalletId: string | null = null;
      if (deliveryZoneId) {
        const { data: pallet } = await sb
          .from("pallets")
          .select("id")
          .eq("pickup_zone_id", desiredPickupZoneId)
          .eq("delivery_zone_id", deliveryZoneId)
          .maybeSingle();
        desiredPalletId = pallet?.id || null;
      }

      const needsUpdate =
        (r.pickup_zone_id || null) !== desiredPickupZoneId ||
        (r.pallet_id || null) !== desiredPalletId;

      if (!needsUpdate) continue;

      const { error: updErr } = await sb
        .from("order_reservations")
        .update({
          pickup_zone_id: desiredPickupZoneId,
          pallet_id: desiredPalletId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", r.id);

      if (updErr) {
        skipped++;
        skippedReasons.update_failed = (skippedReasons.update_failed || 0) + 1;
      } else {
        updated++;
      }
    }

    return NextResponse.json({
      success: true,
      updated,
      skipped,
      skippedReasons,
    });
  } catch (e: any) {
    console.error("fix-active-reservations-pallets error:", e);
    return NextResponse.json(
      { error: e?.message || "Internal server error" },
      { status: 500 },
    );
  }
}

