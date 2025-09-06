import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function checkUserAddressesTable() {
  console.log("🔍 Checking if user_addresses table exists...");

  try {
    // Try to query the table
    const { data, error } = await supabase
      .from("user_addresses")
      .select("id")
      .limit(1);

    if (error) {
      console.log(
        "❌ user_addresses table does not exist or has issues:",
        error.message,
      );
      console.log("📋 Creating user_addresses table...");

      // Create the table
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS user_addresses (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          full_name TEXT NOT NULL,
          email TEXT NOT NULL,
          phone TEXT,
          address_street TEXT NOT NULL,
          address_postcode TEXT NOT NULL,
          address_city TEXT NOT NULL,
          country_code TEXT NOT NULL,
          lat DOUBLE PRECISION,
          lon DOUBLE PRECISION,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `;

      const { error: createError } = await supabase.rpc("exec_sql", {
        sql: createTableSQL,
      });

      if (createError) {
        console.error("❌ Failed to create user_addresses table:", createError);
        return;
      }

      console.log("✅ user_addresses table created successfully!");
    } else {
      console.log("✅ user_addresses table exists and is accessible");
    }
  } catch (error) {
    console.error("❌ Error checking user_addresses table:", error);
  }
}

// Run check if called directly
if (require.main === module) {
  checkUserAddressesTable();
}

export { checkUserAddressesTable };
