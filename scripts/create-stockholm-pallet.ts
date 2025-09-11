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

async function createStockholmPallet() {
  console.log("📦 Creating Stockholm pallet...");

  try {
    // First, get the Stockholm zones we just created
    const { data: zones, error: zonesError } = await supabase
      .from("pallet_zones")
      .select("id, name, zone_type")
      .eq("country_code", "SE")
      .order("zone_type");

    if (zonesError || !zones) {
      console.error("❌ Error fetching Stockholm zones:", zonesError);
      return;
    }

    const pickupZone = zones.find(z => z.zone_type === "pickup");
    const deliveryZone = zones.find(z => z.zone_type === "delivery");

    if (!pickupZone || !deliveryZone) {
      console.error("❌ Stockholm zones not found. Run create-stockholm-zone.ts first.");
      return;
    }

    console.log("📍 Found pickup zone:", pickupZone.name);
    console.log("📍 Found delivery zone:", deliveryZone.name);

    // Get the first producer (Domaine de la Clape)
    const { data: producers, error: producersError } = await supabase
      .from("producers")
      .select("id, name")
      .limit(1);

    if (producersError || !producers || producers.length === 0) {
      console.error("❌ No producers found. Run seed.ts first.");
      return;
    }

    const producer = producers[0];
    console.log("🍷 Using producer:", producer.name);

    // Create Stockholm pallet
    const stockholmPallet = {
      id: randomUUID(),
      name: "Stockholm Pallet",
      bottle_capacity: 24,
      pickup_zone_id: pickupZone.id,
      delivery_zone_id: deliveryZone.id,
    };

    const { error: palletError } = await supabase
      .from("pallets")
      .insert(stockholmPallet);

    if (palletError) {
      console.error("❌ Stockholm pallet error:", palletError);
      return;
    }

    console.log("✅ Stockholm pallet created:", stockholmPallet.name);
    console.log("📦 Capacity:", stockholmPallet.bottle_capacity, "bottles");
    console.log("📍 Pickup zone:", pickupZone.name);
    console.log("📍 Delivery zone:", deliveryZone.name);

    console.log("\n🎉 Stockholm pallet created successfully!");
    console.log("Now checkout should work with Stockholm addresses!");

  } catch (error) {
    console.error("❌ Error creating Stockholm pallet:", error);
  }
}

createStockholmPallet();
