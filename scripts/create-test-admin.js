#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Ladda environment variables från .env.development
dotenv.config({ path: ".env.development" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Missing Supabase environment variables");
  process.exit(1);
}

// Skapa Supabase client med service role
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function createTestAdmin() {
  const testEmail = "test.admin@crowdvine.com";
  const testPassword = "test123456";

  try {
    console.log("🔧 Creating test admin user...");
    console.log(`📧 Email: ${testEmail}`);
    console.log(`🔑 Password: ${testPassword}`);

    // 1. Skapa Supabase Auth-användare
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true, // Bekräfta email direkt
        user_metadata: {
          role: "admin",
        },
      });

    if (authError) {
      console.error("❌ Auth creation error:", authError);
      return;
    }

    if (!authData.user) {
      console.error("❌ No user created");
      return;
    }

    console.log("✅ Auth user created:", authData.user.id);

    // 2. Skapa profil i profiles-tabellen
    const { error: profileError } = await supabase.from("profiles").insert({
      id: authData.user.id,
      email: authData.user.email,
      role: "admin",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      console.error("❌ Profile creation error:", profileError);

      // Ta bort användaren om profilskapning misslyckas
      try {
        await supabase.auth.admin.deleteUser(authData.user.id);
        console.log("🧹 Cleaned up auth user after profile creation failure");
      } catch (deleteError) {
        console.error("❌ Failed to cleanup user:", deleteError);
      }
      return;
    }

    console.log("✅ Profile created successfully");
    console.log("🎉 Test admin user created successfully!");
    console.log("");
    console.log("📋 Login credentials:");
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: ${testPassword}`);
    console.log("");
    console.log("🌐 Login URL: http://localhost:3000/admin/login");
  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
}

createTestAdmin();
