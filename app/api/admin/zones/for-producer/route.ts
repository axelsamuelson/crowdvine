import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Create or update a pickup zone for a producer
 */
export async function POST(request: Request) {
  try {
    await requireAdmin();
    const { producerId, zoneData } = await request.json();

    console.log(
      "📍 Creating/updating zone for producer:",
      producerId,
      zoneData,
    );

    if (!zoneData) {
      return NextResponse.json(
        { error: "Zone data is required" },
        { status: 400 },
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
          { status: 500 },
        );
      }

      zoneId = updatedZone.id;
      console.log(
        `✅ Updated pickup zone ${zoneId} for producer ${producerId}`,
      );
    } else {
      // Check if a zone with this name already exists
      const { data: existingZone } = await supabase
        .from("pallet_zones")
        .select("id")
        .eq("name", zoneData.name)
        .eq("zone_type", "pickup")
        .single();

      if (existingZone) {
        // Use existing zone and update its coordinates
        console.log(
          "Found existing zone with same name, updating:",
          existingZone.id,
        );
        const { data: updatedZone, error: updateError } = await supabase
          .from("pallet_zones")
          .update({
            center_lat: zoneData.lat,
            center_lon: zoneData.lon,
          })
          .eq("id", existingZone.id)
          .select("id")
          .single();

        if (updateError) {
          console.error("Error updating existing zone:", updateError);
          return NextResponse.json(
            { error: `Failed to update zone: ${updateError.message}` },
            { status: 500 },
          );
        }

        zoneId = updatedZone.id;
        console.log(`✅ Updated existing pickup zone ${zoneId}`);
      } else {
        // Create new zone
        console.log("Creating new zone:", zoneData);
        const { data: newZone, error: createError } = await supabase
          .from("pallet_zones")
          .insert({
            name: zoneData.name,
            zone_type: "pickup", // Always pickup for producer zones
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
            { status: 500 },
          );
        }

        zoneId = newZone.id;
        console.log(`✅ Created new pickup zone ${zoneId} for producer`);
      }
    }

    return NextResponse.json({ zoneId });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    if (msg === "Admin authentication required") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    console.error("Zone for producer API error:", error);
    return NextResponse.json(
      { error: `Internal server error: ${msg}` },
      { status: 500 },
    );
  }
}
