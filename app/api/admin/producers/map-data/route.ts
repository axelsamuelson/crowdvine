import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const supabase = getSupabaseAdmin();

  try {
    // Get all producers with location data and additional details
    const { data: producers, error: producersError } = await supabase
      .from("producers")
      .select("id, name, region, lat, lon, short_description, logo_image_path, address_city")
      .not("lat", "is", null)
      .not("lon", "is", null);

    if (producersError) {
      return NextResponse.json(
        { error: "Failed to fetch producers" },
        { status: 500 }
      );
    }

    // Get reservations and wines for each producer
    const producersWithReservations = await Promise.all(
      (producers || []).map(async (producer) => {
        // Get all wines from this producer with details
        const { data: wines, error: winesError } = await supabase
          .from("wines")
          .select("id, wine_name, vintage, color, handle, base_price_cents, label_image_path")
          .eq("producer_id", producer.id);

        if (winesError) {
          console.error(`Error fetching wines for producer ${producer.id}:`, winesError);
        }

        const wineIds = wines?.map((w) => w.id) || [];

        if (wineIds.length === 0) {
          return {
            ...producer,
            reservedBottles: 0,
            wines: [],
          };
        }

        // Get reservations for these wines
        const { data: reservations } = await supabase
          .from("order_reservations")
          .select(
            `
            order_reservation_items (
              quantity,
              wine_id
            )
          `
          )
          .in("status", ["pending_producer_approval", "placed", "approved", "pending_payment", "confirmed"]);

        let totalBottles = 0;
        reservations?.forEach((reservation: any) => {
          const items = reservation.order_reservation_items || [];
          items.forEach((item: any) => {
            if (wineIds.includes(item.wine_id)) {
              totalBottles += item.quantity || 0;
            }
          });
        });

        return {
          ...producer,
          reservedBottles: totalBottles,
          wines: wines || [],
        };
      })
    );

    // Get all zones (pickup and delivery)
    const { data: zones, error: zonesError } = await supabase
      .from("pallet_zones")
      .select("id, name, center_lat, center_lon, radius_km, zone_type")
      .not("center_lat", "is", null)
      .not("center_lon", "is", null);

    if (zonesError) {
      console.error("Error fetching zones:", zonesError);
    }

    return NextResponse.json({ 
      producers: producersWithReservations,
      zones: zones || []
    });
  } catch (error) {
    console.error("Error in map-data API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

