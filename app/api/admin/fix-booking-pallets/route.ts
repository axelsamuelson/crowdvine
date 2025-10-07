import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Admin endpoint to fix pallet assignments for bookings
 * This will update bookings.pallet_id based on matching zones from order_reservations
 */
export async function POST() {
  try {
    const supabase = getSupabaseAdmin();

    // Get all pallets
    const { data: pallets, error: palletsError } = await supabase
      .from("pallets")
      .select("id, name, pickup_zone_id, delivery_zone_id");

    if (palletsError) {
      console.error("Error fetching pallets:", palletsError);
      return NextResponse.json(
        { error: "Failed to fetch pallets" },
        { status: 500 }
      );
    }

    if (!pallets || pallets.length === 0) {
      return NextResponse.json({
        message: "No pallets found",
        updated: 0,
      });
    }

    console.log(`Found ${pallets.length} pallets`);

    let totalUpdated = 0;
    const updateResults = [];

    // For each pallet, find and update matching bookings
    for (const pallet of pallets) {
      if (!pallet.pickup_zone_id || !pallet.delivery_zone_id) {
        console.log(`⚠️  Pallet ${pallet.name} has no zones defined, skipping`);
        updateResults.push({
          pallet: pallet.name,
          status: "skipped",
          reason: "no zones defined",
        });
        continue;
      }

      // Find all reservations that match this pallet's zones
      const { data: reservations, error: reservationsError } = await supabase
        .from("order_reservations")
        .select("id, pickup_zone_id, delivery_zone_id")
        .eq("pickup_zone_id", pallet.pickup_zone_id)
        .eq("delivery_zone_id", pallet.delivery_zone_id);

      if (reservationsError) {
        console.error(`Error fetching reservations for pallet ${pallet.name}:`, reservationsError);
        updateResults.push({
          pallet: pallet.name,
          status: "error",
          error: reservationsError.message,
        });
        continue;
      }

      if (!reservations || reservations.length === 0) {
        console.log(`✅ Pallet ${pallet.name}: No reservations match this pallet`);
        updateResults.push({
          pallet: pallet.name,
          status: "success",
          reservations: 0,
          updated: 0,
        });
        continue;
      }

      console.log(`🔄 Pallet ${pallet.name}: Found ${reservations.length} matching reservations`);

      // Now find bookings for these reservations that don't have pallet_id set
      // We need to join through order_reservation_items to link bookings to reservations
      // But since bookings.item_id refers to order_reservation_items.id, we can do this:
      
      // First, get all order_reservation_items for these reservations
      const { data: items, error: itemsError } = await supabase
        .from("order_reservation_items")
        .select("id, reservation_id")
        .in("reservation_id", reservations.map(r => r.id));

      if (itemsError || !items || items.length === 0) {
        console.log(`⚠️  Pallet ${pallet.name}: No items found for these reservations`);
        updateResults.push({
          pallet: pallet.name,
          status: "success",
          reservations: reservations.length,
          items: 0,
          updated: 0,
        });
        continue;
      }

      console.log(`🔄 Pallet ${pallet.name}: Found ${items.length} items`);

      // Now update bookings that match these item IDs
      const itemIds = items.map(i => i.id);
      
      const { error: updateError, count } = await supabase
        .from("bookings")
        .update({ pallet_id: pallet.id })
        .in("item_id", itemIds)
        .or(`pallet_id.is.null,pallet_id.neq.${pallet.id}`);

      if (updateError) {
        console.error(`Error updating bookings for pallet ${pallet.name}:`, updateError);
        updateResults.push({
          pallet: pallet.name,
          status: "error",
          error: updateError.message,
        });
      } else {
        console.log(`✅ Pallet ${pallet.name}: Updated ${count} bookings`);
        totalUpdated += count || 0;
        updateResults.push({
          pallet: pallet.name,
          status: "success",
          reservations: reservations.length,
          items: items.length,
          updated: count || 0,
        });
      }
    }

    return NextResponse.json({
      message: "Booking pallet assignments updated",
      totalUpdated,
      results: updateResults,
    });

  } catch (error) {
    console.error("Fix booking pallets error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

