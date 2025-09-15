import { getSupabaseAdmin } from "@/lib/supabase-admin";
import * as dotenv from "dotenv";
import { randomUUID } from "crypto";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

async function checkAndCreateTestData() {
  console.log("🔍 Checking database for test data...");

  try {
    const supabase = getSupabaseAdmin();

    // Check producers
    console.log("1️⃣ Checking producers...");
    const { data: producers, error: producersError } = await supabase
      .from('producers')
      .select('id, name, region')
      .limit(5);

    if (producersError) {
      console.error('❌ Error fetching producers:', producersError);
      return;
    }

    console.log(`📊 Found ${producers?.length || 0} producers`);
    if (producers && producers.length > 0) {
      console.log('Producers:', producers.map(p => `${p.name} (${p.region})`));
    }

    // Check wines
    console.log("2️⃣ Checking wines...");
    const { data: wines, error: winesError } = await supabase
      .from('wines')
      .select('id, wine_name, vintage, producer_id')
      .limit(5);

    if (winesError) {
      console.error('❌ Error fetching wines:', winesError);
      return;
    }

    console.log(`📊 Found ${wines?.length || 0} wines`);
    if (wines && wines.length > 0) {
      console.log('Wines:', wines.map(w => `${w.wine_name} ${w.vintage}`));
    }

    // If no producers, create some test producers
    if (!producers || producers.length === 0) {
      console.log("3️⃣ Creating test producers...");
      const testProducers = [
        {
          id: randomUUID(),
          name: "Domaine de la Côte",
          region: "Burgundy",
          description: "Premium Burgundy wines",
          website: "https://domainedelacote.com",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: randomUUID(),
          name: "Château Margaux",
          region: "Bordeaux",
          description: "Classic Bordeaux wines",
          website: "https://chateau-margaux.com",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: randomUUID(),
          name: "Tenuta San Guido",
          region: "Tuscany",
          description: "Italian excellence",
          website: "https://tenutasan guido.it",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      for (const producer of testProducers) {
        const { error } = await supabase
          .from('producers')
          .upsert(producer, { onConflict: 'id' });

        if (error) {
          console.error(`❌ Error creating producer ${producer.name}:`, error);
        } else {
          console.log(`✅ Created producer: ${producer.name}`);
        }
      }
    }

    // If no wines, create some test wines
    if (!wines || wines.length === 0) {
      console.log("4️⃣ Creating test wines...");
      
      // Get producers to use as wine producers
      const { data: allProducers } = await supabase
        .from('producers')
        .select('id, name')
        .limit(3);

      if (allProducers && allProducers.length > 0) {
        const testWines = [
          {
            id: randomUUID(),
            wine_name: "Pinot Noir Reserve",
            vintage: "2022",
            grape_varieties: ["Pinot Noir"],
            color: "Red",
            handle: "pinot-noir-reserve-2022",
            base_price_cents: 45000, // 450 SEK
            producer_id: allProducers[0].id,
            description: "A refined Pinot Noir with elegant tannins and notes of cherry and earth.",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: randomUUID(),
            wine_name: "Chardonnay Blanc",
            vintage: "2023",
            grape_varieties: ["Chardonnay"],
            color: "White",
            handle: "chardonnay-blanc-2023",
            base_price_cents: 35000, // 350 SEK
            producer_id: allProducers[1]?.id || allProducers[0].id,
            description: "Crisp and refreshing white wine with citrus and mineral notes.",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: randomUUID(),
            wine_name: "Cabernet Sauvignon",
            vintage: "2021",
            grape_varieties: ["Cabernet Sauvignon", "Merlot"],
            color: "Red",
            handle: "cabernet-sauvignon-2021",
            base_price_cents: 55000, // 550 SEK
            producer_id: allProducers[2]?.id || allProducers[0].id,
            description: "Full-bodied red wine with dark fruit flavors and structured tannins.",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];

        for (const wine of testWines) {
          const { error } = await supabase
            .from('wines')
            .upsert(wine, { onConflict: 'id' });

          if (error) {
            console.error(`❌ Error creating wine ${wine.wine_name}:`, error);
          } else {
            console.log(`✅ Created wine: ${wine.wine_name} ${wine.vintage}`);
          }
        }
      } else {
        console.log("⚠️ No producers found to create wines");
      }
    }

    console.log("🎉 Test data check and creation completed!");

  } catch (error) {
    console.error("❌ Script failed:", error);
  }
}

// Run script if called directly
if (require.main === module) {
  checkAndCreateTestData();
}
