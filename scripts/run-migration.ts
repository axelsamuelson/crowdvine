import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { readFileSync } from "fs";
import { join } from "path";

// Load environment variables from .env.development
dotenv.config({ path: ".env.development" });

// Use service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function runMigration() {
  console.log("🚀 Running analytics migration...");

  try {
    // Read the migration file
    const migrationPath = join(process.cwd(), "migrations/050_create_analytics_tables.sql");
    const migrationSQL = readFileSync(migrationPath, "utf8");

    console.log("📋 Executing migration SQL...");

    // Split SQL into individual statements and execute them
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 50)}...`);
      const { error } = await supabase.rpc('exec', { sql: statement });
      
      if (error) {
        console.error("❌ Statement error:", error);
        console.error("Statement:", statement);
        return;
      }
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
