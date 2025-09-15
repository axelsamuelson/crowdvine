import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

// Use service role key for admin access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function checkZoneDependencies() {
  console.log("🔍 Checking zone dependencies...\n");

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

    console.log(`📋 Found ${zones.length} zones:\n`);

    for (const zone of zones) {
      console.log(`🏷️ Zone: "${zone.name}" (${zone.zone_type})`);
      console.log(`   ID: ${zone.id}`);
      console.log(`   Radius: ${zone.radius_km} km`);
      console.log(`   Center: ${zone.center_lat}, ${zone.center_lon}`);

      // Check reservations
      const { data: reservations, error: reservationsError } = await supabase
        .from("order_reservations")
        .select("id, status, created_at")
        .or(`pickup_zone_id.eq.${zone.id},delivery_zone_id.eq.${zone.id}`);

      if (reservationsError) {
        console.log(`   ❌ Error checking reservations: ${reservationsError.message}`);
      } else if (reservations && reservations.length > 0) {
        console.log(`   🚫 BLOCKED: Used in ${reservations.length} reservation(s)`);
        reservations.forEach(r => {
          console.log(`      - Reservation ${r.id.substring(0, 8)}... (${r.status}, ${new Date(r.created_at).toLocaleDateString()})`);
        });
      } else {
        console.log(`   ✅ No reservations using this zone`);
      }

      // Check pallets
      const { data: pallets, error: palletsError } = await supabase
        .from("pallets")
        .select("id, name")
        .or(`pickup_zone_id.eq.${zone.id},delivery_zone_id.eq.${zone.id}`);

      if (palletsError) {
        console.log(`   ❌ Error checking pallets: ${palletsError.message}`);
      } else if (pallets && pallets.length > 0) {
        console.log(`   🚫 BLOCKED: Used in ${pallets.length} pallet(s)`);
        pallets.forEach(p => {
          console.log(`      - Pallet "${p.name}" (${p.id.substring(0, 8)}...)`);
        });
      } else {
        console.log(`   ✅ No pallets using this zone`);
      }

      // Summary
      const canDelete = (!reservations || reservations.length === 0) && (!pallets || pallets.length === 0);
      console.log(`   ${canDelete ? '✅ CAN DELETE' : '🚫 CANNOT DELETE'}`);
      console.log("");
    }

  } catch (error) {
    console.error("❌ Error:", error);
  }
}

checkZoneDependencies();
