import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { PALLET_FILL_STATUSES } from "@/lib/pallet-fill-count";

type ProducerUpdateRow = Record<string, string | number | boolean | null>;

/**
 * Get a single producer (admin)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const adminAuth = request.cookies.get("admin-auth")?.value;
    if (!adminAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const producerId = (await params).id;

    const { data: producer, error } = await supabase
      .from("producers")
      .select("*")
      .eq("id", producerId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!producer) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ producer });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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

    const body = (await request.json()) as Record<string, unknown>;
    const supabase = getSupabaseAdmin();
    const producerId = (await params).id;

    console.log("Updating producer:", producerId, body);

    // Read current pickup zone before update so we can migrate active reservations if needed
    const { data: currentProducer } = await supabase
      .from("producers")
      .select("id, pickup_zone_id, shipping_region_id")
      .eq("id", producerId)
      .maybeSingle();

    const updateData: ProducerUpdateRow = {};

    // Only update provided fields
    if (body.name !== undefined) updateData.name = String(body.name);
    if (body.region !== undefined) updateData.region = String(body.region);
    if (body.lat !== undefined) updateData.lat = Number(body.lat);
    if (body.lon !== undefined) updateData.lon = Number(body.lon);
    if (body.country_code !== undefined)
      updateData.country_code = String(body.country_code);
    if (body.address_street !== undefined)
      updateData.address_street = String(body.address_street);
    if (body.address_city !== undefined)
      updateData.address_city = String(body.address_city);
    if (body.address_postcode !== undefined)
      updateData.address_postcode = String(body.address_postcode);
    if (body.short_description !== undefined)
      updateData.short_description = String(body.short_description);
    if (body.logo_image_path !== undefined)
      updateData.logo_image_path = String(body.logo_image_path);
    if (body.pickup_zone_id !== undefined)
      updateData.pickup_zone_id =
        typeof body.pickup_zone_id === "string" && body.pickup_zone_id.trim()
          ? body.pickup_zone_id.trim()
          : null;
    if (body.shipping_region_id !== undefined) {
      updateData.shipping_region_id =
        typeof body.shipping_region_id === "string" &&
        body.shipping_region_id.trim()
          ? body.shipping_region_id.trim()
          : null;
    }
    if (body.is_pallet_zone !== undefined) {
      updateData.is_pallet_zone = Boolean(body.is_pallet_zone);
    }
    if (body.is_live !== undefined) updateData.is_live = Boolean(body.is_live);
    if (body.boost_active !== undefined)
      updateData.boost_active = Boolean(body.boost_active);

    const oldShippingRegionId =
      (currentProducer?.shipping_region_id as string | null | undefined) ??
      null;
    const newShippingRegionId =
      body.shipping_region_id !== undefined
        ? typeof body.shipping_region_id === "string" &&
          body.shipping_region_id.trim()
          ? body.shipping_region_id.trim()
          : null
        : undefined;

    if (
      newShippingRegionId !== undefined &&
      newShippingRegionId !== oldShippingRegionId
    ) {
      const { data: wineRows, error: wineErr } = await supabase
        .from("wines")
        .select("id")
        .eq("producer_id", producerId);

      if (wineErr) {
        console.error(
          "[Producer update] wines for shipping_region guard:",
          wineErr.message,
        );
        return NextResponse.json(
          { error: "Failed to verify reservations" },
          { status: 500 },
        );
      }

      const wineIds = (wineRows ?? [])
        .map((w) => w.id as string)
        .filter((id) => id.length > 0);

      let activeReservations = 0;

      if (wineIds.length > 0) {
        const { data: itemRows, error: itemErr } = await supabase
          .from("order_reservation_items")
          .select("reservation_id")
          .in("item_id", wineIds);

        if (itemErr) {
          console.error(
            "[Producer update] reservation items for shipping_region guard:",
            itemErr.message,
          );
          return NextResponse.json(
            { error: "Failed to verify reservations" },
            { status: 500 },
          );
        }

        const reservationIds = [
          ...new Set(
            (itemRows ?? [])
              .map((r) => r.reservation_id as string | null | undefined)
              .filter((id): id is string => typeof id === "string" && id.length > 0),
          ),
        ];

        if (reservationIds.length > 0) {
          const { count, error: countErr } = await supabase
            .from("order_reservations")
            .select("id", { count: "exact", head: true })
            .in("id", reservationIds)
            .in("status", [...PALLET_FILL_STATUSES]);

          if (countErr) {
            console.error(
              "[Producer update] reservation count for shipping_region guard:",
              countErr.message,
            );
            return NextResponse.json(
              { error: "Failed to verify reservations" },
              { status: 500 },
            );
          }
          activeReservations = count ?? 0;
        }
      }

      if (activeReservations > 0) {
        return NextResponse.json(
          {
            error:
              "Cannot change shipping region while producer has active reservations",
            activeReservations,
            message:
              "Cancel or complete all active reservations before changing the shipping region.",
          },
          { status: 400 },
        );
      }
    }

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

        const wineIds = (wineRows ?? []).map((w) => w.id as string);
        if (wineIds.length > 0) {
          // 2) Find reservation_ids that contain these wines
          const { data: itemRows, error: itemErr } = await supabase
            .from("order_reservation_items")
            .select("reservation_id")
            .in("item_id", wineIds);
          if (itemErr) throw itemErr;

          const reservationIds = Array.from(
            new Set(
              (itemRows ?? []).map((r) => r.reservation_id as string),
            ),
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
                (reservations ?? [])
                  .map((r) => r.delivery_zone_id as string | null)
                  .filter((id): id is string => Boolean(id)),
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
              (pallets ?? []).forEach((p) => {
                if (p.delivery_zone_id && p.id) {
                  palletIdByDeliveryZoneId.set(
                    p.delivery_zone_id as string,
                    p.id as string,
                  );
                }
              });
            }

            for (const r of reservations ?? []) {
              const deliveryId = r.delivery_zone_id as string | null;
              const newPalletId = newPickupZoneId
                ? (deliveryId
                    ? palletIdByDeliveryZoneId.get(deliveryId) ?? null
                    : null)
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
  } catch (error: unknown) {
    console.error("Producer update API error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
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
  } catch (error: unknown) {
    console.error("Producer delete API error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
