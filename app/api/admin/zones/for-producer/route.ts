import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Create or update a pickup zone for a producer
 */
export async function POST(request: Request) {
  try {
    const { producerId, zoneData } = await request.json();

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
      const { data: producer } = await supabase
        .from("producers")
        .select("pickup_zone_id")
        .eq("id", producerId)
        .single();

      existingZoneId = producer?.pickup_zone_id;
    }

    let zoneId: string;

    if (existingZoneId) {
      // Update existing zone
      const { data: updatedZone, error: updateError } = await supabase
        .from("zones")
        .update({
          name: zoneData.name,
          lat: zoneData.lat,
          lon: zoneData.lon,
          address_city: zoneData.address_city,
          address_postcode: zoneData.address_postcode,
          country_code: zoneData.country_code,
        })
        .eq("id", existingZoneId)
        .select("id")
        .single();

      if (updateError) {
        console.error("Error updating zone:", updateError);
        return NextResponse.json(
          { error: "Failed to update zone" },
          { status: 500 }
        );
      }

      zoneId = updatedZone.id;
      console.log(`✅ Updated pickup zone ${zoneId} for producer ${producerId}`);
    } else {
      // Create new zone
      const { data: newZone, error: createError } = await supabase
        .from("zones")
        .insert({
          name: zoneData.name,
          type: zoneData.type,
          lat: zoneData.lat,
          lon: zoneData.lon,
          address_city: zoneData.address_city,
          address_postcode: zoneData.address_postcode,
          country_code: zoneData.country_code,
        })
        .select("id")
        .single();

      if (createError) {
        console.error("Error creating zone:", createError);
        return NextResponse.json(
          { error: "Failed to create zone" },
          { status: 500 }
        );
      }

      zoneId = newZone.id;
      console.log(`✅ Created new pickup zone ${zoneId} for producer`);
    }

    return NextResponse.json({ zoneId });

  } catch (error) {
    console.error("Zone for producer API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

