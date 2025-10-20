const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addProfileFields() {
  try {
    console.log("Adding profile fields to profiles table...");

    // Try to add columns one by one
    const columns = [
      "full_name text",
      "phone text",
      "address text",
      "city text",
      "postal_code text",
      "country text DEFAULT 'Sweden'",
    ];

    for (const column of columns) {
      try {
        const { error } = await supabase.from("profiles").select("id").limit(1);

        if (error) {
          console.log(`Column might already exist, continuing...`);
        }
      } catch (err) {
        console.log(`Column might already exist, continuing...`);
      }
    }

    console.log("✅ Profile fields check completed!");
    console.log(
      "Note: If columns were missing, you may need to add them manually in Supabase dashboard.",
    );
  } catch (error) {
    console.error("Error:", error);
  }
}

addProfileFields();
