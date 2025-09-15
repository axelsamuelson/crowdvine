import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

// Use service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function generateSimpleCode(): string {
  // Generate a 20-digit random number
  return Math.floor(Math.random() * 100000000000000000000).toString().padStart(20, '0');
}

async function createTestInvitationCode() {
  console.log("🔑 Creating test invitation code...");

  try {
    // Generate a simple 20-digit code
    const code = generateSimpleCode();
    console.log("🎯 Generated code:", code);

    // Create invitation code directly
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    const { data, error } = await supabase
      .from('invitation_codes')
      .insert({
        code,
        email: null, // General use
        expires_at: expiresAt.toISOString(),
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Error creating invitation code:", error);
      console.log("💡 This might mean the migration hasn't been run yet.");
      console.log("📋 Please run the migration_access_control.sql in your Supabase SQL editor first.");
      return;
    }

    console.log("✅ Test invitation code created successfully!");
    console.log(`📝 Code: ${data.code}`);
    console.log(`⏰ Expires: ${data.expires_at}`);
    console.log("\n🧪 Test this code at: http://localhost:3000/access-request");

  } catch (error) {
    console.error("❌ Script failed:", error);
  }
}

// Run if called directly
if (require.main === module) {
  createTestInvitationCode();
}

export { createTestInvitationCode };