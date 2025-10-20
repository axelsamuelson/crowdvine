import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

// Use service role key for admin access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function testAdminQueries() {
  console.log("🧪 Testing admin dashboard queries...\n");

  try {
    // Test each query that admin dashboard uses
    const queries = [
      {
        name: "producers",
        query: () =>
          supabase
            .from("producers")
            .select("*", { count: "exact", head: true }),
      },
      {
        name: "wines",
        query: () =>
          supabase.from("wines").select("*", { count: "exact", head: true }),
      },
      {
        name: "bookings",
        query: () =>
          supabase.from("bookings").select("*", { count: "exact", head: true }),
      },
      {
        name: "pallet_zones",
        query: () =>
          supabase
            .from("pallet_zones")
            .select("*", { count: "exact", head: true }),
      },
      {
        name: "pallets",
        query: () =>
          supabase.from("pallets").select("*", { count: "exact", head: true }),
      },
    ];

    for (const { name, query } of queries) {
      console.log(`🔍 Testing ${name} table...`);
      try {
        const { data, error, count } = await query();
        if (error) {
          console.log(`   ❌ Error: ${error.message}`);
          console.log(`   Code: ${error.code}`);
          console.log(`   Details: ${error.details}`);
        } else {
          console.log(`   ✅ Success: ${count || 0} records`);
        }
      } catch (err) {
        console.log(`   ❌ Exception: ${err}`);
      }
      console.log("");
    }

    // Test complex queries
    console.log("🔍 Testing complex queries...");

    // Test bookings with joins
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          `
          id,
          quantity,
          created_at,
          wines(wine_name, vintage, producers(name))
        `,
        )
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        console.log(`   ❌ Bookings join error: ${error.message}`);
      } else {
        console.log(
          `   ✅ Bookings join success: ${data?.length || 0} records`,
        );
      }
    } catch (err) {
      console.log(`   ❌ Bookings join exception: ${err}`);
    }

    // Test pallets with joins
    try {
      const { data, error } = await supabase
        .from("pallets")
        .select(
          `
          id,
          name,
          bottle_capacity,
          bookings(quantity)
        `,
        )
        .limit(5);

      if (error) {
        console.log(`   ❌ Pallets join error: ${error.message}`);
      } else {
        console.log(`   ✅ Pallets join success: ${data?.length || 0} records`);
      }
    } catch (err) {
      console.log(`   ❌ Pallets join exception: ${err}`);
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

testAdminQueries();
