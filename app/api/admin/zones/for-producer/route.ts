import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Create or update a pickup zone for a producer
 */
export async function POST(request: Request) {
  try {
    const { producerId, zoneData } = await request.json();

    console.log("📍 Creating/updating zone for producer:", producerId, zoneData);

    if (!zoneData) {
      return NextResponse.json(
        { error: "Zone data is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Check if producer already has a pickup zone
    let existingZoneId = null;
    if (producerId) {
      const { data: producer, error: producerError } = await supabase
        .from("producers")
        .select("pickup_zone_id")
        .eq("id", producerId)
        .single();

      if (producerError) {
        console.error("Error fetching producer:", producerError);
        // Continue anyway - might be a new producer
      } else {
        existingZoneId = producer?.pickup_zone_id;
        console.log("Existing zone ID:", existingZoneId);
      }
    }

    let zoneId: string;

    if (existingZoneId) {
      // Update existing zone
      console.log("Updating existing zone:", existingZoneId);
      const { data: updatedZone, error: updateError } = await supabase
        .from("pallet_zones")
        .update({
          name: zoneData.name,
          center_lat: zoneData.lat,
          center_lon: zoneData.lon,
        })
        .eq("id", existingZoneId)
        .select("id")
        .single();

      if (updateError) {
        console.error("Error updating zone:", updateError);
        return NextResponse.json(
          { error: `Failed to update zone: ${updateError.message}` },
          { status: 500 }
        );
      }

      zoneId = updatedZone.id;
      console.log(`✅ Updated pickup zone ${zoneId} for producer ${producerId}`);
    } else {
      // Create new zone
      console.log("Creating new zone:", zoneData);
      const { data: newZone, error: createError } = await supabase
        .from("pallet_zones")
        .insert({
          name: zoneData.name,
          zone_type: 'pickup', // Always pickup for producer zones
          center_lat: zoneData.lat,
          center_lon: zoneData.lon,
          radius_km: 100, // Default 100km radius for producer pickup zones
        })
        .select("id")
        .single();

      if (createError) {
        console.error("Error creating zone:", createError);
        return NextResponse.json(
          { error: `Failed to create zone: ${createError.message}` },
          { status: 500 }
        );
      }

      zoneId = newZone.id;
      console.log(`✅ Created new pickup zone ${zoneId} for producer`);
    }

    return NextResponse.json({ zoneId });

  } catch (error: any) {
    console.error("Zone for producer API error:", error);
    return NextResponse.json(
      { error: `Internal server error: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}

