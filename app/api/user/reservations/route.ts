import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await supabaseServer();

    // Get current authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 },
      );
    }

    // Fetch real reservations from database
    const { data: reservations, error: reservationsError } = await supabase
      .from("order_reservations")
      .select(
        `
        id,
        status,
        created_at,
        pickup_zone_id,
        delivery_zone_id,
        user_addresses (
          full_name,
          email,
          phone,
          address_street,
          address_postcode,
          address_city,
          country_code
        ),
        order_reservation_items (
          quantity,
          price_band,
          wines (
            id,
            wine_name,
            vintage,
            grape_varieties,
            color,
            base_price_cents,
            producers (
              name,
              region,
              country_code
            )
          )
        ),
        reservation_tracking (
          tracking_code,
          created_at
        )
      `,
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (reservationsError) {
      console.error("Error fetching reservations:", reservationsError);
      return NextResponse.json(
        { error: "Failed to fetch reservations" },
        { status: 500 },
      );
    }

    // Transform the data to match the expected format
    const transformedReservations = await Promise.all(
      (reservations || []).map(async (reservation) => {
        // Fetch zone information if available
        let zones = null;
        if (reservation.pickup_zone_id || reservation.delivery_zone_id) {
          const zoneQueries = [];

          if (reservation.pickup_zone_id) {
            zoneQueries.push(
              supabase
                .from("pallet_zones")
                .select("name, zone_type")
                .eq("id", reservation.pickup_zone_id)
                .single(),
            );
          }

          if (reservation.delivery_zone_id) {
            zoneQueries.push(
              supabase
                .from("pallet_zones")
                .select("name, zone_type")
                .eq("id", reservation.delivery_zone_id)
                .single(),
            );
          }

          const zoneResults = await Promise.all(zoneQueries);
          const pickupZone = zoneResults[0]?.data;
          const deliveryZone = zoneResults[1]?.data;

          zones = {
            pickup: pickupZone,
            delivery: deliveryZone,
          };
        }

        // Fetch pallet information if we have both zones
        let pallet = null;
        if (reservation.pickup_zone_id && reservation.delivery_zone_id) {
          try {
            // Try to find a pallet that matches both zones
            const { data: pallets, error: palletError } = await supabase
              .from("pallets")
              .select(
                `
                id,
                name,
                bottle_capacity,
                created_at
              `,
              )
              .eq("pickup_zone_id", reservation.pickup_zone_id)
              .eq("delivery_zone_id", reservation.delivery_zone_id)
              .limit(1);

            if (palletError) {
              console.error("Error fetching pallet:", palletError);
            } else if (pallets && pallets.length > 0) {
              const palletData = pallets[0];

              // Calculate current bottles from bookings with timestamps
              const { data: bookings, error: bookingError } = await supabase
                .from("bookings")
                .select("quantity, created_at")
                .eq("pallet_id", palletData.id)
                .order("created_at", { ascending: true });

              if (bookingError) {
                console.error("Error fetching bookings:", bookingError);
              }

              const currentBottles =
                bookings?.reduce((sum, booking) => sum + booking.quantity, 0) ||
                0;

              // Calculate estimated days remaining based on actual booking activity
              let estimatedDaysRemaining = null;
              if (currentBottles > 0 && bookings && bookings.length > 0) {
                const firstBookingDate = new Date(bookings[0].created_at);
                const lastBookingDate = new Date(bookings[bookings.length - 1].created_at);
                const now = new Date();
                
                // Use the time span from first booking to now, or last booking to now if more recent
                const activePeriodEnd = lastBookingDate > firstBookingDate ? lastBookingDate : now;
                const daysSinceFirstBooking = Math.max(1, Math.floor((activePeriodEnd.getTime() - firstBookingDate.getTime()) / (1000 * 60 * 60 * 24)));
                
                const averageBottlesPerDay = currentBottles / daysSinceFirstBooking;
                const remainingBottles = Math.max(0, palletData.bottle_capacity - currentBottles);
                
                if (averageBottlesPerDay > 0 && remainingBottles > 0) {
                  estimatedDaysRemaining = Math.ceil(remainingBottles / averageBottlesPerDay);
                }
              }

              pallet = {
                id: palletData.id,
                name: palletData.name,
                bottle_capacity: palletData.bottle_capacity,
                currentBottles,
                remainingBottles: Math.max(0, palletData.bottle_capacity - currentBottles),
                estimatedDaysRemaining,
                created_at: palletData.created_at,
              };
            }
          } catch (error) {
            console.error("Error in pallet fetching:", error);
          }
        }

        return {
          id: reservation.id,
          status: reservation.status,
          created_at: reservation.created_at,
          address: reservation.user_addresses,
          zones,
          pallet,
          items:
            reservation.order_reservation_items?.map((item) => ({
              quantity: item.quantity,
              price_band: item.price_band,
              wines: item.wines,
            })) || [],
          tracking: reservation.reservation_tracking
            ? {
                code: reservation.reservation_tracking.tracking_code,
                created_at: reservation.reservation_tracking.created_at,
              }
            : null,
        };
      }),
    );

    return NextResponse.json({
      reservations: transformedReservations,
      message: "User reservations fetched successfully",
      user: {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name,
      },
    });
  } catch (error) {
    console.error("Error fetching user reservations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
