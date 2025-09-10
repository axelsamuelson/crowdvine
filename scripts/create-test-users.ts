import { getSupabaseAdmin } from "@/lib/supabase-admin";
import * as dotenv from "dotenv";
import { randomUUID } from "crypto";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

async function createTestUsers() {
  console.log("👥 Creating test users...");

  try {
    const supabase = getSupabaseAdmin();

    // Create test users
    const testUsers = [
      {
        id: randomUUID(),
        email: "john.doe@example.com",
        role: "user",
        access_granted_at: new Date().toISOString(),
        invite_code_used: "57280597760032980000",
      },
      {
        id: randomUUID(), 
        email: "jane.smith@example.com",
        role: "user",
        access_granted_at: null,
        invite_code_used: null,
      },
      {
        id: randomUUID(),
        email: "admin@crowdvine.com",
        role: "admin",
        access_granted_at: new Date().toISOString(),
        invite_code_used: null,
      },
    ];

    for (const user of testUsers) {
      const { error } = await supabase
        .from('profiles')
        .upsert(user, { onConflict: 'id' });

      if (error) {
        console.error(`❌ Error creating user ${user.email}:`, error);
      } else {
        console.log(`✅ Created user: ${user.email} (${user.role})`);
      }
    }

    console.log("🎉 Test users created successfully!");

  } catch (error) {
    console.error("❌ Script failed:", error);
  }
}

// Run if called directly
if (require.main === module) {
  createTestUsers();
}

export { createTestUsers };
