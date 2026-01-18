import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  try {
    const sb = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const reservationId = searchParams.get("reservationId");

    if (!reservationId) {
      return NextResponse.json(
        { error: "Reservation ID is required" },
        { status: 400 },
      );
    }

    // Get reservation details
    const { data: reservation, error: reservationError } = await sb
      .from("order_reservations")
      .select(
        `
        *,
        user_addresses!inner (
          full_name,
          email,
          phone,
          address_street,
          address_postcode,
          address_city,
          country_code
        )
      `,
      )
      .eq("id", reservationId)
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
      .eq("reservation_id", reservationId);

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
        // Get current bottle count for this pallet
        const { data: bookings, error: bookingsError } = await sb
          .from("bookings")
          .select("quantity");

        const currentBottles = bookingsError
          ? 0
          : bookings?.reduce((sum, booking) => sum + booking.quantity, 0) || 0;

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
      .eq("reservation_id", reservationId)
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
