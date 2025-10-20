import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function createWineImagesTable() {
  console.log("🔄 Creating wine_images table...");

  try {
    // First, let's check if the table already exists
    const { data: tables, error: tablesError } = await supabase
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public")
      .eq("table_name", "wine_images");

    if (tablesError) {
      console.log(
        "Could not check existing tables, proceeding with creation...",
      );
    } else if (tables && tables.length > 0) {
      console.log("✅ wine_images table already exists!");
      return;
    }

    // Try to create the table using a different approach
    console.log("Attempting to create wine_images table...");

    // We'll use a simple approach - try to insert a test record first
    // If it fails, we know the table doesn't exist
    const { error: testError } = await supabase
      .from("wine_images")
      .select("id")
      .limit(1);

    if (testError && testError.code === "PGRST116") {
      console.log("❌ Table 'wine_images' does not exist.");
      console.log(
        "\n📝 Please create the table manually in Supabase dashboard:",
      );
      console.log("\n1. Go to your Supabase project dashboard");
      console.log("2. Navigate to SQL Editor");
      console.log("3. Run the following SQL:");
      console.log(`
-- Create wine_images table
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

-- Create indexes
CREATE INDEX idx_wine_images_wine_id ON wine_images(wine_id);
CREATE INDEX idx_wine_images_sort_order ON wine_images(wine_id, sort_order);
CREATE INDEX idx_wine_images_primary ON wine_images(wine_id, is_primary);

-- Migrate existing data
INSERT INTO wine_images (wine_id, image_path, alt_text, sort_order, is_primary)
SELECT 
  id as wine_id,
  label_image_path as image_path,
  CONCAT(wine_name, ' ', vintage) as alt_text,
  0 as sort_order,
  TRUE as is_primary
FROM wines 
WHERE label_image_path IS NOT NULL AND label_image_path != '';

-- Add constraint to ensure only one primary image per wine
CREATE UNIQUE INDEX idx_wine_images_unique_primary ON wine_images(wine_id) WHERE is_primary = TRUE;

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_wine_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER wine_images_updated_at
    BEFORE UPDATE ON wine_images
    FOR EACH ROW
    EXECUTE FUNCTION update_wine_images_updated_at();
      `);
      console.log(
        "\n4. After creating the table, run this script again to verify it works.",
      );
    } else if (testError) {
      console.error("❌ Unexpected error:", testError);
    } else {
      console.log("✅ wine_images table exists and is accessible!");

      // Test if we can read from it
      const { data: images, error: readError } = await supabase
        .from("wine_images")
        .select("id, wine_id, image_path")
        .limit(5);

      if (readError) {
        console.error("❌ Error reading from wine_images:", readError);
      } else {
        console.log("✅ Successfully read from wine_images table!");
        console.log(`Found ${images?.length || 0} existing images`);
        if (images && images.length > 0) {
          console.log("Sample image:", images[0]);
        }
      }
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

// Run if called directly
if (require.main === module) {
  createWineImagesTable();
}

export { createWineImagesTable };
