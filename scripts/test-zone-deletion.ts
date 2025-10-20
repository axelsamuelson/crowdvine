import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

// Use service role key for admin access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function testZoneDeletion() {
  console.log("🧪 Testing zone deletion...\n");

  try {
    // Get all zones
    const { data: zones, error: zonesError } = await supabase
      .from("pallet_zones")
      .select("*")
      .order("name");

    if (zonesError) {
      console.error("❌ Error fetching zones:", zonesError);
      return;
    }

    if (!zones || zones.length === 0) {
      console.log("ℹ️ No zones found in database");
      return;
    }

    // Test deleting the first zone
    const testZone = zones[0];
    console.log(
      `🎯 Testing deletion of zone: "${testZone.name}" (${testZone.id})`,
    );

    // Try to delete the zone directly
    const { error: deleteError } = await supabase
      .from("pallet_zones")
      .delete()
      .eq("id", testZone.id);

    if (deleteError) {
      console.log(`❌ Direct deletion failed: ${deleteError.message}`);
      console.log(`   Error code: ${deleteError.code}`);
      console.log(`   Error details: ${deleteError.details}`);
      console.log(`   Error hint: ${deleteError.hint}`);
    } else {
      console.log(`✅ Direct deletion successful!`);

      // Recreate the zone for testing
      const { error: recreateError } = await supabase
        .from("pallet_zones")
        .insert({
          id: testZone.id,
          name: testZone.name,
          radius_km: testZone.radius_km,
          center_lat: testZone.center_lat,
          center_lon: testZone.center_lon,
          zone_type: testZone.zone_type,
        });

      if (recreateError) {
        console.log(`⚠️ Failed to recreate zone: ${recreateError.message}`);
      } else {
        console.log(`✅ Zone recreated successfully`);
      }
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

testZoneDeletion();
