import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

// Use service role key for seeding (local only)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function updateStockholmZoneCoordinates() {
  console.log("🏙️ Updating Stockholm zone coordinates...");

  try {
    // Get Stockholm delivery zone
    const { data: zones, error: zonesError } = await supabase
      .from("pallet_zones")
      .select("id, name, center_lat, center_lon")
      .eq("name", "Stockholm 50km");

    if (zonesError || !zones || zones.length === 0) {
      console.error("❌ Stockholm delivery zone not found");
      return;
    }

    const zone = zones[0];
    console.log("📍 Current coordinates:", zone.center_lat, zone.center_lon);

    // Update with more accurate Stockholm coordinates
    // Stockholm city center coordinates
    const newLat = 59.3293;
    const newLon = 18.0686;

    const { error: updateError } = await supabase
      .from("pallet_zones")
      .update({
        center_lat: newLat,
        center_lon: newLon
      })
      .eq("id", zone.id);

    if (updateError) {
      console.error("❌ Error updating Stockholm zone:", updateError);
      return;
    }

    console.log("✅ Stockholm zone coordinates updated:");
    console.log("📍 New coordinates:", newLat, newLon);
    console.log("📍 Location: Stockholm city center");

    // Also update pickup zone
    const { data: pickupZones, error: pickupError } = await supabase
      .from("pallet_zones")
      .select("id, name")
      .eq("name", "Stockholm Pickup Point");

    if (!pickupError && pickupZones && pickupZones.length > 0) {
      const pickupZone = pickupZones[0];
      
      const { error: updatePickupError } = await supabase
        .from("pallet_zones")
        .update({
          center_lat: newLat,
          center_lon: newLon
        })
        .eq("id", pickupZone.id);

      if (!updatePickupError) {
        console.log("✅ Stockholm pickup zone coordinates updated");
      }
    }

    console.log("\n🎉 Stockholm zones updated successfully!");
    console.log("Now geocoding will work with accurate coordinates");

  } catch (error) {
    console.error("❌ Error updating Stockholm zones:", error);
  }
}

updateStockholmZoneCoordinates();
