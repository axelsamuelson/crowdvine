import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

export async function POST() {
  try {
    const supabase = getSupabaseAdmin();

    // Create Stockholm delivery zone
    const stockholmDeliveryZone = {
      id: randomUUID(),
      name: "Stockholm 50km",
      radius_km: 50,
      center_lat: 59.3293,
      center_lon: 18.0686,
      zone_type: "delivery" as const,
      country_code: "SE",
    };

    const { error: deliveryZoneError } = await supabase
      .from("pallet_zones")
      .insert(stockholmDeliveryZone);

    if (deliveryZoneError) {
      console.error("Delivery zone error:", deliveryZoneError);
    }

    // Create Stockholm pickup zone
    const stockholmPickupZone = {
      id: randomUUID(),
      name: "Stockholm Pickup Point",
      radius_km: 10,
      center_lat: 59.3293,
      center_lon: 18.0686,
      zone_type: "pickup" as const,
      country_code: "SE",
    };

    const { error: pickupZoneError } = await supabase
      .from("pallet_zones")
      .insert(stockholmPickupZone);

    if (pickupZoneError) {
      console.error("Pickup zone error:", pickupZoneError);
    }

    // Get the zones we just created
    const { data: zones, error: zonesError } = await supabase
      .from("pallet_zones")
      .select("id, name, zone_type")
      .eq("country_code", "SE")
      .order("zone_type");

    if (zonesError || !zones) {
      return NextResponse.json({ error: "Failed to fetch zones" }, { status: 500 });
    }

    const pickupZone = zones.find(z => z.zone_type === "pickup");
    const deliveryZone = zones.find(z => z.zone_type === "delivery");

    if (!pickupZone || !deliveryZone) {
      return NextResponse.json({ error: "Zones not found" }, { status: 500 });
    }

    // Create Stockholm pallet
    const stockholmPallet = {
      id: randomUUID(),
      name: "The Languedoc Mixed Pallet",
      description: "A curated selection of exceptional wines from the Languedoc region",
      bottle_capacity: 600,
      cost_cents: 50000, // 500 SEK
      pickup_zone_id: pickupZone.id,
      delivery_zone_id: deliveryZone.id,
    };

    const { error: palletError } = await supabase
      .from("pallets")
      .insert(stockholmPallet);

    if (palletError) {
      console.error("Pallet error:", palletError);
    }

    return NextResponse.json({
      success: true,
      message: "Test data created successfully",
      data: {
        deliveryZone: stockholmDeliveryZone,
        pickupZone: stockholmPickupZone,
        pallet: stockholmPallet,
      }
    });

  } catch (error) {
    console.error("Error creating test data:", error);
    return NextResponse.json(
      { error: "Failed to create test data" },
      { status: 500 }
    );
  }
}
