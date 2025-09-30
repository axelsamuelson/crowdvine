import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST() {
  try {
    console.log("🇸🇪 Creating Sweden delivery zones...");
    
    const supabase = getSupabaseAdmin();
    
    // Sweden delivery zones data
    const swedenZones = [
      {
        name: "Stockholm Delivery Zone",
        center_lat: 59.3293,
        center_lon: 18.0686,
        radius_km: 150, // Increased radius to cover more area
        zone_type: "delivery",
        country_code: "SE"
      },
      {
        name: "Gothenburg Delivery Zone", 
        center_lat: 57.7089,
        center_lon: 11.9746,
        radius_km: 150,
        zone_type: "delivery",
        country_code: "SE"
      },
      {
        name: "Malmö Delivery Zone",
        center_lat: 55.6059,
        center_lon: 13.0007,
        radius_km: 150,
        zone_type: "delivery", 
        country_code: "SE"
      },
      {
        name: "Uppsala Delivery Zone",
        center_lat: 59.8586,
        center_lon: 17.6389,
        radius_km: 100,
        zone_type: "delivery",
        country_code: "SE"
      },
      {
        name: "Linköping Delivery Zone",
        center_lat: 58.4108,
        center_lon: 15.6214,
        radius_km: 100,
        zone_type: "delivery",
        country_code: "SE"
      },
      {
        name: "Örebro Delivery Zone",
        center_lat: 59.2741,
        center_lon: 15.2066,
        radius_km: 100,
        zone_type: "delivery",
        country_code: "SE"
      },
      {
        name: "Västerås Delivery Zone",
        center_lat: 59.6099,
        center_lon: 16.5448,
        radius_km: 100,
        zone_type: "delivery",
        country_code: "SE"
      },
      {
        name: "Helsingborg Delivery Zone",
        center_lat: 56.0467,
        center_lon: 12.6944,
        radius_km: 100,
        zone_type: "delivery",
        country_code: "SE"
      }
    ];
    
    // Check if zones already exist
    const { data: existingZones, error: checkError } = await supabase
      .from("pallet_zones")
      .select("name")
      .eq("zone_type", "delivery")
      .eq("country_code", "SE");
    
    if (checkError) {
      console.error("❌ Error checking existing zones:", checkError);
      return NextResponse.json({ error: "Failed to check existing zones" }, { status: 500 });
    }
    
    const existingZoneNames = existingZones?.map(zone => zone.name) || [];
    console.log("📍 Existing Sweden delivery zones:", existingZoneNames);
    
    // Filter out zones that already exist
    const zonesToCreate = swedenZones.filter(zone => !existingZoneNames.includes(zone.name));
    
    if (zonesToCreate.length === 0) {
      console.log("✅ All Sweden delivery zones already exist");
      return NextResponse.json({ 
        success: true, 
        message: "All Sweden delivery zones already exist",
        existingZones: existingZoneNames.length
      });
    }
    
    console.log(`🔄 Creating ${zonesToCreate.length} new delivery zones...`);
    
    // Create the zones
    const { data: createdZones, error: createError } = await supabase
      .from("pallet_zones")
      .insert(zonesToCreate)
      .select("id, name");
    
    if (createError) {
      console.error("❌ Error creating zones:", createError);
      return NextResponse.json({ error: "Failed to create zones" }, { status: 500 });
    }
    
    console.log("✅ Successfully created zones:", createdZones?.map(z => z.name));
    
    // Also create a pickup zone for Sweden (needed for pallets)
    const { data: existingPickupZones } = await supabase
      .from("pallet_zones")
      .select("name")
      .eq("zone_type", "pickup")
      .eq("country_code", "SE");
    
    const existingPickupNames = existingPickupZones?.map(zone => zone.name) || [];
    
    if (!existingPickupNames.includes("Sweden Pickup Zone")) {
      console.log("🔄 Creating Sweden pickup zone...");
      
      const { error: pickupError } = await supabase
        .from("pallet_zones")
        .insert({
          name: "Sweden Pickup Zone",
          center_lat: 59.3293, // Stockholm coordinates
          center_lon: 18.0686,
          radius_km: 50,
          zone_type: "pickup",
          country_code: "SE"
        });
      
      if (pickupError) {
        console.error("❌ Error creating pickup zone:", pickupError);
      } else {
        console.log("✅ Created Sweden pickup zone");
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Successfully created ${zonesToCreate.length} delivery zones`,
      createdZones: createdZones?.map(z => z.name),
      totalZones: (existingZoneNames.length + zonesToCreate.length)
    });
    
  } catch (error) {
    console.error("❌ Create Sweden zones error:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
