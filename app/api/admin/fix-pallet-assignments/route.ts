import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Admin endpoint to fix pallet assignments for reservations
 * This will update order_reservations.pallet_id based on matching zones
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

    // For each pallet, find and update matching reservations
    for (const pallet of pallets) {
      if (!pallet.pickup_zone_id || !pallet.delivery_zone_id) {
        console.log(`⚠️  Pallet ${pallet.name} has no zones defined, skipping`);
        continue;
      }

      // Find reservations matching this pallet's zones but not assigned to it
      const { data: reservations, error: reservationsError } = await supabase
        .from("order_reservations")
        .select("id, order_id, pickup_zone_id, delivery_zone_id, pallet_id")
        .eq("pickup_zone_id", pallet.pickup_zone_id)
        .eq("delivery_zone_id", pallet.delivery_zone_id)
        .or(`pallet_id.is.null,pallet_id.neq.${pallet.id}`);

      if (reservationsError) {
        console.error(`Error fetching reservations for pallet ${pallet.name}:`, reservationsError);
        continue;
      }

      if (!reservations || reservations.length === 0) {
        console.log(`✅ Pallet ${pallet.name}: No reservations need updating`);
        continue;
      }

      console.log(`🔄 Pallet ${pallet.name}: Found ${reservations.length} reservations to update`);

      // Update each reservation
      const reservationIds = reservations.map(r => r.id);
      
      const { error: updateError, count } = await supabase
        .from("order_reservations")
        .update({ pallet_id: pallet.id })
        .in("id", reservationIds);

      if (updateError) {
        console.error(`Error updating reservations for pallet ${pallet.name}:`, updateError);
        updateResults.push({
          pallet: pallet.name,
          status: "error",
          error: updateError.message,
        });
      } else {
        console.log(`✅ Pallet ${pallet.name}: Updated ${count} reservations`);
        totalUpdated += count || 0;
        updateResults.push({
          pallet: pallet.name,
          status: "success",
          updated: count || 0,
          reservationIds: reservations.map(r => r.order_id || r.id),
        });
      }
    }

    return NextResponse.json({
      message: "Pallet assignments updated",
      totalUpdated,
      results: updateResults,
    });

  } catch (error) {
    console.error("Fix pallet assignments error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

