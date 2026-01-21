import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const sb = getSupabaseAdmin();

    // Get pallets with zones (we compute counts from reservations/items to stay data-driven)
    const { data, error } = await sb
      .from("pallets")
      .select(
        `
        *,
        delivery_zone:pallet_zones!delivery_zone_id(id, name, zone_type),
        pickup_zone:pallet_zones!pickup_zone_id(id, name, zone_type)
      `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching pallets:", error);
      return NextResponse.json([]);
    }

    // Handle case when no pallets exist
    if (!data || data.length === 0) {
      return NextResponse.json([]);
    }

    const pallets = data as any[];
    const palletIdByKey = new Map<string, string>();
    pallets.forEach((p: any) => {
      if (p.pickup_zone_id && p.delivery_zone_id) {
        palletIdByKey.set(`${p.pickup_zone_id}|${p.delivery_zone_id}`, p.id);
      }
    });

    const pickupZoneIds = Array.from(
      new Set(pallets.map((p: any) => p.pickup_zone_id).filter(Boolean)),
    ) as string[];
    const deliveryZoneIds = Array.from(
      new Set(pallets.map((p: any) => p.delivery_zone_id).filter(Boolean)),
    ) as string[];

    // Active reservations are what we care about for "current" pallet fill.
    const activeStatuses = ["placed", "approved", "partly_approved", "pending_payment", "confirmed"];

    const { data: reservations, error: resErr } = await sb
      .from("order_reservations")
      .select("id, delivery_zone_id")
      .in("status", activeStatuses)
      .in("delivery_zone_id", deliveryZoneIds);

    if (resErr) {
      console.error("Error fetching reservations for pallet stats:", resErr);
      return NextResponse.json([]);
    }

    const reservationIds = (reservations || []).map((r: any) => r.id);
    const deliveryZoneByReservationId = new Map<string, string>();
    (reservations || []).forEach((r: any) => {
      if (r.delivery_zone_id)
        deliveryZoneByReservationId.set(r.id, r.delivery_zone_id);
    });

    const bottlesByPalletId = new Map<string, number>();
    const wineAggByPalletId = new Map<string, Record<string, any>>();

    if (reservationIds.length > 0) {
      const { data: items, error: itemsErr } = await sb
        .from("order_reservation_items")
        .select("reservation_id, item_id, quantity, producer_approved_quantity")
        .in("reservation_id", reservationIds);

      if (itemsErr) {
        console.error("Error fetching reservation items for pallet stats:", itemsErr);
        return NextResponse.json([]);
      }

      const wineIds = Array.from(
        new Set((items || []).map((i: any) => i.item_id).filter(Boolean)),
      ) as string[];

      const wineById = new Map<string, any>();
      if (wineIds.length > 0) {
        const { data: wines, error: winesErr } = await sb
          .from("wines")
          .select("id, wine_name, vintage, grape_varieties, color, base_price_cents, producer_id")
          .in("id", wineIds);

        if (winesErr) {
          console.error("Error fetching wines for pallet stats:", winesErr);
          return NextResponse.json([]);
        }
        (wines || []).forEach((w: any) => wineById.set(w.id, w));
      }

      const producerIds = Array.from(
        new Set(
          Array.from(wineById.values())
            .map((w: any) => w.producer_id)
            .filter(Boolean),
        ),
      ) as string[];

      const pickupZoneByProducerId = new Map<string, string>();
      const producerNameById = new Map<string, string>();
      const moqByProducerId = new Map<string, number>();

      if (producerIds.length > 0) {
        // NOTE: During rollout, the DB may not yet have the `moq_min_bottles` column.
        // We attempt to select it, but gracefully fall back to MOQ=0 if the column doesn't exist.
        const primary = await sb
          .from("producers")
          .select("id, name, pickup_zone_id, moq_min_bottles")
          .in("id", producerIds);

        let producers = primary.data as any[] | null;
        let prodErr = primary.error;

        if (prodErr) {
          const msg = String((prodErr as any)?.message || prodErr);
          const isMissingMoqColumn =
            msg.includes("moq_min_bottles") && (msg.includes("schema cache") || msg.includes("column"));

          if (isMissingMoqColumn) {
            const fallback = await sb
              .from("producers")
              .select("id, name, pickup_zone_id")
              .in("id", producerIds);
            producers = fallback.data as any[] | null;
            prodErr = fallback.error;
          }
        }

        if (prodErr) {
          console.error("Error fetching producers for pallet stats:", prodErr);
          return NextResponse.json([]);
        }

        (producers || []).forEach((p: any) => {
          if (p?.id && p?.pickup_zone_id)
            pickupZoneByProducerId.set(p.id, p.pickup_zone_id);
          if (p?.id && p?.name) producerNameById.set(p.id, p.name);
          if (p?.id) {
            const raw = p?.moq_min_bottles;
            const parsed =
              raw === null || raw === undefined ? 0 : Math.max(0, Math.floor(Number(raw) || 0));
            moqByProducerId.set(p.id, parsed);
          }
        });
      }

      // First pass: sum bottles per (pallet, producer) to apply MOQ.
      const bottlesByPalletProducerKey = new Map<string, number>();
      const prepared: Array<{
        palletId: string;
        producerId: string;
        qty: number;
        wine: any;
      }> = [];

      for (const it of items || []) {
        const deliveryZoneId = deliveryZoneByReservationId.get(it.reservation_id);
        if (!deliveryZoneId) continue;

        const wine = wineById.get(it.item_id);
        if (!wine) continue;

        const pickupZoneId = pickupZoneByProducerId.get(wine.producer_id);
        if (!pickupZoneId) continue;

        // Only count pallets that exist in this page
        if (!pickupZoneIds.includes(pickupZoneId)) continue;

        const palletId = palletIdByKey.get(`${pickupZoneId}|${deliveryZoneId}`);
        if (!palletId) continue;

        const qty =
          it.producer_approved_quantity === null ||
          it.producer_approved_quantity === undefined
            ? it.quantity || 0
            : Number(it.producer_approved_quantity) || 0;

        const producerId = wine.producer_id;
        const producerKey = `${palletId}|${producerId}`;
        bottlesByPalletProducerKey.set(
          producerKey,
          (bottlesByPalletProducerKey.get(producerKey) || 0) + qty,
        );
        prepared.push({ palletId, producerId, qty, wine });
      }

      const eligibleByPalletProducerKey = new Map<string, boolean>();
      for (const [key, producerTotal] of bottlesByPalletProducerKey.entries()) {
        const producerId = key.split("|")[1];
        const moq = moqByProducerId.get(producerId) || 0;
        eligibleByPalletProducerKey.set(key, producerTotal >= moq);
      }

      for (const row of prepared) {
        const key = `${row.palletId}|${row.producerId}`;
        if (!eligibleByPalletProducerKey.get(key)) continue;

        bottlesByPalletId.set(
          row.palletId,
          (bottlesByPalletId.get(row.palletId) || 0) + row.qty,
        );

        const wineKey = `${row.wine.wine_name}-${row.wine.vintage}`;
        const agg = wineAggByPalletId.get(row.palletId) || {};
        if (!agg[wineKey]) {
          agg[wineKey] = {
            wine_name: row.wine.wine_name,
            vintage: row.wine.vintage,
            grape_varieties: row.wine.grape_varieties,
            color: row.wine.color,
            producer: producerNameById.get(row.producerId) || "Unknown",
            total_quantity: 0,
            base_price_cents: row.wine.base_price_cents,
          };
        }
        agg[wineKey].total_quantity += row.qty;
        wineAggByPalletId.set(row.palletId, agg);
      }
    }

    // Transform data to include calculated fields
    const transformedData = pallets.map((pallet) => {
      const totalBookedBottles = bottlesByPalletId.get(pallet.id) || 0;
      const remainingBottles = pallet.bottle_capacity - totalBookedBottles;
      const completionPercentage =
        (totalBookedBottles / pallet.bottle_capacity) * 100;

      // Group wines by type for summary
      const wineSummary = wineAggByPalletId.get(pallet.id) || {};

      return {
        ...pallet,
        total_booked_bottles: totalBookedBottles,
        remaining_bottles: remainingBottles,
        completion_percentage: completionPercentage,
        wine_summary: Object.values(wineSummary),
        is_complete: totalBookedBottles >= pallet.bottle_capacity,
        needs_ordering: remainingBottles > 0,
      };
    });

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error("Unexpected error in pallets API:", error);
    // Return empty array on any unexpected error
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  const sb = getSupabaseAdmin();
  const body = await request.json();

  const { data, error } = await sb
    .from("pallets")
    .insert(body)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
