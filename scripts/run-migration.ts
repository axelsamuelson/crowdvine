import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { readFileSync } from "fs";
import { join } from "path";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

// Use service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function runMigration() {
  console.log("🚀 Running access control migration...");

  try {
    // Read the migration file
    const migrationPath = join(process.cwd(), "migration_access_control.sql");
    const migrationSQL = readFileSync(migrationPath, "utf8");

    console.log("📋 Executing migration SQL...");

    // Execute the migration
    const { error } = await supabase.rpc("exec_sql", { sql: migrationSQL });

    if (error) {
      console.error("❌ Migration error:", error);
      return;
    }

    console.log("✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  }
}

// Run if called directly
if (require.main === module) {
  runMigration();
}

export { runMigration };
