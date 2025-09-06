import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

// Load environment variables
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function runMigration() {
  console.log("🔄 Running migration: Add zone_type and pickup_zone...");

  try {
    // Read migration SQL
    const migrationPath = path.join(
      process.cwd(),
      "migrations",
      "add_zone_type_and_pickup_zone.sql",
    );
    const sql = fs.readFileSync(migrationPath, "utf8");

    // Split SQL into individual statements
    const statements = sql
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        const { error } = await supabase.rpc("exec_sql", { sql: statement });

        if (error) {
          console.error("❌ Migration error:", error);
          return;
        }
      }
    }

    console.log("✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  }
}

// Run migration if called directly
if (require.main === module) {
  runMigration();
}

export { runMigration };
