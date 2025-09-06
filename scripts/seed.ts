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

async function seed() {
  console.log("🌱 Starting seed...");

  try {
    // 1. Create producer in Languedoc (near Béziers)
    const producer = {
      id: randomUUID(),
      name: "Domaine de la Clape",
      region: "Languedoc",
      lat: 43.3444, // Near Béziers
      lon: 3.2169,
      country_code: "FR",
      address_street: "Route de Narbonne",
      address_city: "Béziers",
      address_postcode: "34500",
      short_description: "Premium wines from Languedoc",
      logo_image_path:
        "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=600&fit=crop",
    };

    const { error: producerError } = await supabase
      .from("producers")
      .insert(producer);

    if (producerError) {
      console.error("❌ Producer error:", producerError);
      return;
    }
    console.log("✅ Producer created:", producer.name);

    // 2. Create zone (Béziers 500 km)
    const zone = {
      id: randomUUID(),
      name: "Béziers 500 km",
      radius_km: 500,
      center_lat: 43.3444,
      center_lon: 3.2169,
      zone_type: "delivery",
    };

    const { error: zoneError } = await supabase
      .from("pallet_zones")
      .insert(zone);

    if (zoneError) {
      console.error("❌ Zone error:", zoneError);
      return;
    }
    console.log("✅ Zone created:", zone.name);

    // 3. Create pickup zone
    const pickupZone = {
      id: randomUUID(),
      name: "Béziers Pickup Point",
      radius_km: 50,
      center_lat: 43.3444,
      center_lon: 3.2169,
      zone_type: "pickup",
    };

    const { error: pickupZoneError } = await supabase
      .from("pallet_zones")
      .insert(pickupZone);

    if (pickupZoneError) {
      console.error("❌ Pickup zone error:", pickupZoneError);
      return;
    }
    console.log("✅ Pickup zone created:", pickupZone.name);

    // Update producer with pickup zone
    const { error: updateProducerError } = await supabase
      .from("producers")
      .update({ pickup_zone_id: pickupZone.id })
      .eq("id", producer.id);

    if (updateProducerError) {
      console.error("❌ Producer update error:", updateProducerError);
      return;
    }
    console.log("✅ Producer updated with pickup zone");

    // 4. Create wines directly (no campaigns needed)
    const wines = [
      {
        id: randomUUID(),
        handle: "domaine-clape-rouge-2020",
        wine_name: "Domaine de la Clape Rouge",
        vintage: "2020",
        grape_varieties: "Syrah, Grenache, Mourvèdre",
        color: "red",
        label_image_path:
          "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=600&fit=crop",
        base_price_cents: 14800, // 148 SEK
        producer_id: producer.id,
      },
      {
        id: randomUUID(),
        handle: "domaine-clape-blanc-2021",
        wine_name: "Domaine de la Clape Blanc",
        vintage: "2021",
        grape_varieties: "Grenache Blanc, Roussanne",
        color: "white",
        label_image_path:
          "https://images.unsplash.com/photo-1553361371-9b22f78e8b5d?w=600&h=600&fit=crop",
        base_price_cents: 17800, // 178 SEK
        producer_id: producer.id,
      },
      {
        id: randomUUID(),
        handle: "domaine-clape-rose-2022",
        wine_name: "Domaine de la Clape Rosé",
        vintage: "2022",
        grape_varieties: "Grenache, Cinsault",
        color: "rose",
        label_image_path:
          "https://images.unsplash.com/photo-1553361371-9b22f78e8b5d?w=600&h=600&fit=crop",
        base_price_cents: 11800, // 118 SEK
        producer_id: producer.id,
      },
    ];

    for (const wine of wines) {
      const { error: wineError } = await supabase.from("wines").insert(wine);

      if (wineError) {
        console.error("❌ Wine error:", wineError);
        return;
      }
      console.log("✅ Wine created:", wine.wine_name);
    }

    console.log("🎉 Seed completed successfully!");
    console.log("\n📋 Created:");
    console.log(`- Producer: ${producer.name}`);
    console.log(`- Delivery Zone: ${zone.name}`);
    console.log(`- Pickup Zone: ${pickupZone.name}`);
    console.log(`- Wines: ${wines.length} items`);
    console.log("\n🔗 Test URLs:");
    console.log(`- Shop: http://localhost:3000/shop`);
    console.log(`- Product: http://localhost:3000/product/${wines[0].handle}`);
  } catch (error) {
    console.error("❌ Seed failed:", error);
  }
}

// Run seed if called directly
if (require.main === module) {
  seed();
}

export { seed };
