import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Update a producer
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check admin cookie
    const adminAuth = request.cookies.get("admin-auth")?.value;
    if (!adminAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const supabase = getSupabaseAdmin();
    const producerId = (await params).id;

    console.log("Updating producer:", producerId, body);

    // Read current pickup zone before update so we can migrate active reservations if needed
    const { data: currentProducer } = await supabase
      .from("producers")
      .select("id, pickup_zone_id")
      .eq("id", producerId)
      .maybeSingle();

    const updateData: any = {};

    // Only update provided fields
    if (body.name !== undefined) updateData.name = body.name;
    if (body.region !== undefined) updateData.region = body.region;
    if (body.lat !== undefined) updateData.lat = body.lat;
    if (body.lon !== undefined) updateData.lon = body.lon;
    if (body.country_code !== undefined)
      updateData.country_code = body.country_code;
    if (body.address_street !== undefined)
      updateData.address_street = body.address_street;
    if (body.address_city !== undefined)
      updateData.address_city = body.address_city;
    if (body.address_postcode !== undefined)
      updateData.address_postcode = body.address_postcode;
    if (body.short_description !== undefined)
      updateData.short_description = body.short_description;
    if (body.logo_image_path !== undefined)
      updateData.logo_image_path = body.logo_image_path;
    if (body.pickup_zone_id !== undefined)
      updateData.pickup_zone_id = body.pickup_zone_id || null;

    const { data: producer, error } = await supabase
      .from("producers")
      .update(updateData)
      .eq("id", producerId)
      .select()
      .single();

    if (error) {
      console.error("Update producer error:", error);
      return NextResponse.json(
        {
          error: error.message,
          details: error,
          code: error.code,
        },
        { status: 500 },
      );
    }

    console.log("Producer updated:", producer.id);

    // If pickup zone changed, update active reservations that include wines from this producer
    const oldPickupZoneId = currentProducer?.pickup_zone_id || null;
    const newPickupZoneId = producer.pickup_zone_id || null;

    const pickupZoneChanged = oldPickupZoneId !== newPickupZoneId;
    let reservationsUpdated = 0;
    let reservationsSkipped = 0;

    if (pickupZoneChanged) {
      try {
        // Active statuses (used elsewhere in the codebase)
        const activeStatuses = ["placed", "approved", "partly_approved", "pending_payment", "confirmed"];

        // 1) Get wine IDs for this producer
        const { data: wineRows, error: wineErr } = await supabase
          .from("wines")
          .select("id")
          .eq("producer_id", producerId);
        if (wineErr) throw wineErr;

        const wineIds = (wineRows || []).map((w: any) => w.id);
        if (wineIds.length > 0) {
          // 2) Find reservation_ids that contain these wines
          const { data: itemRows, error: itemErr } = await supabase
            .from("order_reservation_items")
            .select("reservation_id")
            .in("item_id", wineIds);
          if (itemErr) throw itemErr;

          const reservationIds = Array.from(
            new Set((itemRows || []).map((r: any) => r.reservation_id)),
          );

          if (reservationIds.length > 0) {
            // 3) Load active reservations (and only ones currently on the old pickup zone)
            let reservationsQuery = supabase
              .from("order_reservations")
              .select("id, status, pickup_zone_id, delivery_zone_id")
              .in("id", reservationIds)
              .in("status", activeStatuses);

            if (oldPickupZoneId) {
              reservationsQuery = reservationsQuery.eq(
                "pickup_zone_id",
                oldPickupZoneId,
              );
            } else {
              reservationsQuery = reservationsQuery.is("pickup_zone_id", null);
            }

            const { data: reservations, error: resErr } =
              await reservationsQuery;
            if (resErr) throw resErr;

            const deliveryZoneIds = Array.from(
              new Set(
                (reservations || [])
                  .map((r: any) => r.delivery_zone_id)
                  .filter(Boolean),
              ),
            ) as string[];

            // Map delivery_zone_id -> pallet_id for the new pickup zone
            const palletIdByDeliveryZoneId = new Map<string, string>();
            if (newPickupZoneId && deliveryZoneIds.length > 0) {
              const { data: pallets, error: palletErr } = await supabase
                .from("pallets")
                .select("id, delivery_zone_id")
                .eq("pickup_zone_id", newPickupZoneId)
                .in("delivery_zone_id", deliveryZoneIds);
              if (palletErr) throw palletErr;
              (pallets || []).forEach((p: any) =>
                palletIdByDeliveryZoneId.set(p.delivery_zone_id, p.id),
              );
            }

            for (const r of reservations || []) {
              const newPalletId = newPickupZoneId
                ? palletIdByDeliveryZoneId.get(r.delivery_zone_id) || null
                : null;

              const { error: updErr } = await supabase
                .from("order_reservations")
                .update({
                  pickup_zone_id: newPickupZoneId,
                  pallet_id: newPalletId,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", r.id);

              if (updErr) {
                reservationsSkipped++;
              } else {
                reservationsUpdated++;
              }
            }
          }
        }
      } catch (e) {
        console.error(
          "[Producer update] Failed to migrate active reservations after pickup zone change:",
          e,
        );
      }
    }

    return NextResponse.json({ success: true, producer });
  } catch (error: any) {
    console.error("Producer update API error:", error);
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 },
    );
  }
}

/**
 * Delete a producer
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check admin cookie
    const adminAuth = request.cookies.get("admin-auth")?.value;
    if (!adminAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const producerId = (await params).id;

    console.log("Deleting producer:", producerId);

    const { error } = await supabase
      .from("producers")
      .delete()
      .eq("id", producerId);

    if (error) {
      console.error("Delete producer error:", error);
      return NextResponse.json(
        {
          error: error.message,
          details: error,
        },
        { status: 500 },
      );
    }

    console.log("Producer deleted:", producerId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Producer delete API error:", error);
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 },
    );
  }
}
