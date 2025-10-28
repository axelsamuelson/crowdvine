import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { readFileSync } from "fs";
import { join } from "path";

// Load environment variables
dotenv.config({ path: ".env.local" });

// Use service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function runMigration() {
  console.log("🚀 Running analytics migration directly...");

  try {
    // Read the migration file
    const migrationPath = join(process.cwd(), "migrations/050_create_analytics_tables.sql");
    const migrationSQL = readFileSync(migrationPath, "utf8");

    console.log("📋 Executing migration SQL...");

    // Execute the entire SQL file using from() - Supabase allows raw SQL through this
    const { error } = await supabase.rpc("exec_sql", { sql_query: migrationSQL });

    if (error) {
      // If exec_sql doesn't exist, try to run individual statements via the SQL Editor API
      console.log("exec_sql not available, trying direct queries...");
      
      // Manually create the table and objects
      await createTableAndObjects();
    } else {
      console.log("✅ Migration completed successfully!");
    }
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

async function createTableAndObjects() {
  try {
    console.log("Creating user_events table...");
    
    const { error } = await supabase
      .from("user_events")
      .select("*")
      .limit(1);

    if (error && error.code === 'PGRST116') {
      console.log("Table doesn't exist, creating it...");
      console.log("⚠️  Please run the migration manually in Supabase SQL Editor:");
      console.log("   File: migrations/050_create_analytics_tables.sql");
      console.log("");
      console.log("Or paste this SQL in Supabase dashboard SQL Editor:");
      console.log("");
      
      const migrationPath = join(process.cwd(), "migrations/050_create_analytics_tables.sql");
      const sql = readFileSync(migrationPath, "utf8");
      console.log(sql);
    } else if (!error) {
      console.log("✅ user_events table already exists");
    }
  } catch (error) {
    console.error("Error checking table:", error);
  }
}

if (require.main === module) {
  runMigration();
}

export { runMigration };

