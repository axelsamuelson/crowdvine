import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

// Use service role key for admin access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function checkProducerZoneUsage() {
  console.log("🔍 Checking producer zone usage...\n");

  try {
    // Get all producers with their zone references
    const { data: producers, error: producersError } = await supabase
      .from("producers")
      .select("id, name, pickup_zone_id");

    if (producersError) {
      console.error("❌ Error fetching producers:", producersError);
      return;
    }

    if (!producers || producers.length === 0) {
      console.log("ℹ️ No producers found in database");
      return;
    }

    console.log(`📋 Found ${producers.length} producers:\n`);

    for (const producer of producers) {
      console.log(`🏭 Producer: "${producer.name}"`);
      console.log(`   ID: ${producer.id}`);
      
      if (producer.pickup_zone_id) {
        console.log(`   🚛 Pickup Zone ID: ${producer.pickup_zone_id}`);
        
        // Get zone details
        const { data: zone, error: zoneError } = await supabase
          .from("pallet_zones")
          .select("name, zone_type")
          .eq("id", producer.pickup_zone_id)
          .single();
          
        if (zoneError) {
          console.log(`      ❌ Error fetching zone: ${zoneError.message}`);
        } else if (zone) {
          console.log(`      📍 Zone: "${zone.name}" (${zone.zone_type})`);
        }
      } else {
        console.log(`   🚛 Pickup Zone ID: None`);
      }
      
      console.log("");
    }

    // Check which zones are used by producers
    console.log("🚫 Zones that CANNOT be deleted (used by producers):");
    const usedZoneIds = new Set<string>();
    
    producers.forEach(producer => {
      if (producer.pickup_zone_id) usedZoneIds.add(producer.pickup_zone_id);
    });

    if (usedZoneIds.size === 0) {
      console.log("   ✅ No zones are used by producers");
    } else {
      for (const zoneId of usedZoneIds) {
        const { data: zone, error: zoneError } = await supabase
          .from("pallet_zones")
          .select("name, zone_type")
          .eq("id", zoneId)
          .single();
          
        if (zone) {
          console.log(`   🚫 "${zone.name}" (${zone.zone_type}) - ID: ${zoneId}`);
        }
      }
    }

  } catch (error) {
    console.error("❌ Error:", error);
  }
}

checkProducerZoneUsage();
