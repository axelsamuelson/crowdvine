import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

// Use service role key for seeding (local only)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function createStockholmZone() {
  console.log("🏙️ Creating Stockholm delivery zone...");

  try {
    // Create Stockholm delivery zone
    const stockholmZone = {
      id: randomUUID(),
      name: "Stockholm 50km",
      radius_km: 50,
      center_lat: 59.3293, // Stockholm coordinates
      center_lon: 18.0686,
      zone_type: "delivery",
      country_code: "SE", // Sweden
    };

    const { error: zoneError } = await supabase
      .from("pallet_zones")
      .insert(stockholmZone);

    if (zoneError) {
      console.error("❌ Stockholm zone error:", zoneError);
      return;
    }
    console.log("✅ Stockholm delivery zone created:", stockholmZone.name);
    console.log("📍 Center:", stockholmZone.center_lat, stockholmZone.center_lon);
    console.log("📏 Radius:", stockholmZone.radius_km, "km");
    console.log("🏳️ Country:", stockholmZone.country_code);

    // Also create a Stockholm pickup zone
    const stockholmPickupZone = {
      id: randomUUID(),
      name: "Stockholm Pickup Point",
      radius_km: 10,
      center_lat: 59.3293,
      center_lon: 18.0686,
      zone_type: "pickup",
      country_code: "SE",
    };

    const { error: pickupZoneError } = await supabase
      .from("pallet_zones")
      .insert(stockholmPickupZone);

    if (pickupZoneError) {
      console.error("❌ Stockholm pickup zone error:", pickupZoneError);
      return;
    }
    console.log("✅ Stockholm pickup zone created:", stockholmPickupZone.name);

    console.log("\n🎉 Stockholm zones created successfully!");
    console.log("Now you can test with Stockholm addresses like:");
    console.log("- Grevgatan 49, 11458 Stockholm");
    console.log("- Centralplan 15, 111 20 Stockholm");

  } catch (error) {
    console.error("❌ Error creating Stockholm zones:", error);
  }
}

createStockholmZone();
