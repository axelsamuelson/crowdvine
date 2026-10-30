import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/supabase-server";

const reservationIdSchema = z.string().min(1);

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reservationId = reservationIdSchema.safeParse(
      new URL(request.url).searchParams.get("reservationId"),
    );
    if (!reservationId.success) {
      return NextResponse.json(
        { error: "Reservation ID is required" },
        { status: 400 },
      );
    }

    const sb = getSupabaseAdmin();

    const { data: reservation, error: reservationError } = await sb
      .from("order_reservations")
      .select(
        `
        id,
        status,
        created_at,
        pickup_zone_id,
        delivery_zone_id,
        user_addresses!inner (
          full_name,
          address_street,
          address_postcode,
          address_city,
          country_code
        )
      `,
      )
      .eq("id", reservationId.data)
      .eq("user_id", user.id)
      .single();

    if (reservationError || !reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 },
      );
    }

    // Get reservation items with wine details
    const { data: reservationItems, error: itemsError } = await sb
      .from("order_reservation_items")
      .select(
        `
        quantity,
        price_band,
        wines!inner (
          id,
          wine_name,
          vintage,
          grape_varieties,
          color,
          base_price_cents,
          producers!inner (
            name,
            region,
            country_code
          )
        )
      `,
      )
      .eq("reservation_id", reservationId.data);

    if (itemsError) {
      console.error("Failed to fetch reservation items:", itemsError);
    }

    // Get zone information
    let zones = null;
    if (reservation.pickup_zone_id || reservation.delivery_zone_id) {
      const { data: zoneData, error: zoneError } = await sb
        .from("pallet_zones")
        .select("id, name, zone_type")
        .in(
          "id",
          [reservation.pickup_zone_id, reservation.delivery_zone_id].filter(
            Boolean,
          ),
        );

      if (!zoneError && zoneData) {
        zones = {
          pickup: zoneData.find((z) => z.id === reservation.pickup_zone_id),
          delivery: zoneData.find((z) => z.id === reservation.delivery_zone_id),
        };
      }
    }

    // Get pallet information if zones are available
    let pallet = null;
    if (zones?.pickup && zones?.delivery) {
      const { data: palletData, error: palletError } = await sb
        .from("pallets")
        .select(
          `
          id,
          name,
          bottle_capacity,
          pickup_zone_id,
          delivery_zone_id
        `,
        )
        .eq("pickup_zone_id", zones.pickup.id)
        .eq("delivery_zone_id", zones.delivery.id)
        .single();

      if (!palletError && palletData) {
        // Canonical fill: active order_reservations only (never legacy bookings,
        // never archived/cancelled reservations).
        const { sumReservedBottlesOnPalletResult } = await import(
          "@/lib/pallet-fill-count"
        );
        const fill = await sumReservedBottlesOnPalletResult(palletData.id);
        const currentBottles = fill.ok ? fill.bottles : 0;

        pallet = {
          ...palletData,
          currentBottles,
          remainingBottles: palletData.bottle_capacity - currentBottles,
        };
      }
    }

    // Get tracking information
    const { data: tracking, error: trackingError } = await sb
      .from("reservation_tracking")
      .select("tracking_code, created_at")
      .eq("reservation_id", reservationId.data)
      .single();

    return NextResponse.json({
      reservation: {
        id: reservation.id,
        status: reservation.status,
        created_at: reservation.created_at,
        address: reservation.user_addresses,
        zones,
        pallet,
        tracking: tracking
          ? {
              code:
                typeof tracking.tracking_code === "string"
                  ? tracking.tracking_code
                  : tracking.tracking_code?.data || "N/A",
              created_at: tracking.created_at,
            }
          : null,
      },
      items: reservationItems || [],
    });
  } catch (error) {
    console.error("Error fetching reservation details:", error);
    return NextResponse.json(
      { error: "Failed to fetch reservation details" },
      { status: 500 },
    );
  }
}
