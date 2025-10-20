import { getSupabaseAdmin } from "@/lib/supabase-admin";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

async function checkProfilesTable() {
  console.log("🔍 Checking profiles table structure...");

  try {
    const supabase = getSupabaseAdmin();

    // Get all profiles to see the structure
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("*")
      .limit(1);

    if (error) {
      console.error("❌ Error fetching profiles:", error);
      return;
    }

    console.log("📋 Profiles table structure:");
    if (profiles && profiles.length > 0) {
      console.log("Columns:", Object.keys(profiles[0]));
    } else {
      console.log("No profiles found, checking table schema...");

      // Try to get table info
      const { data: tableInfo, error: tableError } = await supabase
        .from("profiles")
        .select("*")
        .limit(0);

      if (tableError) {
        console.error("❌ Table error:", tableError);
      } else {
        console.log("✅ Table exists but is empty");
      }
    }
  } catch (error) {
    console.error("❌ Script failed:", error);
  }
}

// Run if called directly
if (require.main === module) {
  checkProfilesTable();
}

export { checkProfilesTable };
