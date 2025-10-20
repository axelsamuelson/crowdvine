import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function runWineImagesMigration() {
  console.log("🔄 Running migration: Create wine_images table...");

  try {
    // For now, let's just test if we can connect and create a simple table
    console.log("Testing connection...");

    // Test connection by trying to read from wines table
    const { data: wines, error: testError } = await supabase
      .from("wines")
      .select("id, wine_name")
      .limit(1);

    if (testError) {
      console.error("❌ Connection test failed:", testError);
      return;
    }

    console.log("✅ Connection successful!");
    console.log("Sample wine:", wines?.[0]);

    // Note: The actual table creation would need to be done through Supabase dashboard
    // or through a direct database connection. For now, we'll assume the table exists.
    console.log(
      "📝 Please create the wine_images table manually through Supabase dashboard:",
    );
    console.log(`
CREATE TABLE wine_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wine_id UUID NOT NULL REFERENCES wines(id) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  alt_text TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_wine_images_wine_id ON wine_images(wine_id);
CREATE INDEX idx_wine_images_sort_order ON wine_images(wine_id, sort_order);
CREATE INDEX idx_wine_images_primary ON wine_images(wine_id, is_primary);

INSERT INTO wine_images (wine_id, image_path, alt_text, sort_order, is_primary)
SELECT 
  id as wine_id,
  label_image_path as image_path,
  CONCAT(wine_name, ' ', vintage) as alt_text,
  0 as sort_order,
  TRUE as is_primary
FROM wines 
WHERE label_image_path IS NOT NULL AND label_image_path != '';

CREATE UNIQUE INDEX idx_wine_images_unique_primary ON wine_images(wine_id) WHERE is_primary = TRUE;
    `);
  } catch (error) {
    console.error("❌ Migration failed:", error);
  }
}

// Run migration if called directly
if (require.main === module) {
  runWineImagesMigration();
}

export { runWineImagesMigration };
