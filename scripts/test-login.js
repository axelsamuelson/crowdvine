#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Ladda environment variables från .env.development
dotenv.config({ path: ".env.development" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error("❌ Missing Supabase environment variables");
  process.exit(1);
}

// Skapa Supabase client med anon key (som frontend använder)
const supabase = createClient(supabaseUrl, anonKey);

async function testLogin() {
  const testEmail = "test.admin@crowdvine.com";
  const testPassword = "test123456";

  try {
    console.log("🔧 Testing login flow...");
    console.log(`📧 Email: ${testEmail}`);
    console.log(`🔑 Password: ${testPassword}`);

    // 1. Testa login
    console.log("📝 Attempting login...");
    const { data, error } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (error) {
      console.error("❌ Login error:", error);
      return;
    }

    if (!data?.user) {
      console.error("❌ No user returned from login");
      return;
    }

    console.log("✅ Login successful!");
    console.log("👤 User ID:", data.user.id);
    console.log("📧 User email:", data.user.email);

    // 2. Testa att hämta profil
    console.log("📝 Fetching user profile...");
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profileError) {
      console.error("❌ Profile fetch error:", profileError);
      return;
    }

    console.log("✅ Profile fetched successfully");
    console.log("👑 User role:", profile?.role);

    if (profile?.role !== "admin") {
      console.error("❌ User does not have admin role");
      return;
    }

    console.log("✅ User has admin role!");
    console.log("🎉 Login flow test completed successfully!");

    // 3. Testa logout
    console.log("📝 Testing logout...");
    const { error: logoutError } = await supabase.auth.signOut();

    if (logoutError) {
      console.error("❌ Logout error:", logoutError);
    } else {
      console.log("✅ Logout successful!");
    }
  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
}

testLogin();
