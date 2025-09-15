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

async function fixUserProfile() {
  const email = "ave.samuelson@gmail.com";

  try {
    console.log("🔧 Checking user profile for:", email);

    // 1. Hitta användaren i Auth
    console.log("📝 Looking up user in Auth...");
    const { data: authUser, error: authError } =
      await supabase.auth.admin.listUsers();

    // Hitta användaren med rätt email
    const user = authUser.users.find((u) => u.email === email);

    if (authError) {
      console.error("❌ Auth lookup error:", authError.message);
      return;
    }

    if (!user) {
      console.log("ℹ️ User not found in Auth, creating new user...");

      // Skapa ny användare
      const { data: newUser, error: createError } =
        await supabase.auth.admin.createUser({
          email,
          password: "temp123456",
          email_confirm: true,
          user_metadata: {
            role: "admin",
          },
        });

      if (createError) {
        console.error("❌ User creation error:", createError.message);
        return;
      }

      console.log("✅ New user created:", newUser.user.id);

      // Skapa profil
      const { error: profileError } = await supabase.from("profiles").insert({
        id: newUser.user.id,
        email: newUser.user.email,
        role: "admin",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (profileError) {
        console.error("❌ Profile creation error:", profileError.message);
        return;
      }

      console.log("✅ Profile created successfully");
      console.log("📧 New credentials:");
      console.log("   Email:", email);
      console.log("   Password: temp123456");
      return;
    }

    console.log("✅ User found in Auth:", user.id);

    // 2. Kontrollera om profilen finns
    console.log("📝 Checking profile in database...");
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) {
      if (profileError.code === "PGRST116") {
        console.log("⚠️ Profile not found, creating profile...");

        // Skapa profil
        const { error: createProfileError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            email: user.email,
            role: "admin",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (createProfileError) {
          console.error(
            "❌ Profile creation error:",
            createProfileError.message,
          );
          return;
        }

        console.log("✅ Profile created successfully");
      } else {
        console.error("❌ Profile lookup error:", profileError.message);
        return;
      }
    } else {
      console.log("✅ Profile found:", profile);

      // Uppdatera rollen om den inte är admin
      if (profile.role !== "admin") {
        console.log("⚠️ User is not admin, updating role...");

        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            role: "admin",
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);

        if (updateError) {
          console.error("❌ Role update error:", updateError.message);
          return;
        }

        console.log("✅ Role updated to admin");
      }
    }

    // 3. Testa login
    console.log("📝 Testing login...");
    const { data: loginData, error: loginError } =
      await supabase.auth.signInWithPassword({
        email,
        password: "temp123456", // Vi vet inte det riktiga lösenordet, så vi använder det temporära
      });

    if (loginError) {
      console.log(
        "⚠️ Login test failed (expected if password is different):",
        loginError.message,
      );
      console.log("📧 To login, use:");
      console.log("   Email:", email);
      console.log(
        "   Password: (the password you set when creating the account)",
      );
    } else {
      console.log("✅ Login test successful!");
    }

    console.log("🎉 User profile fix completed!");
  } catch (error) {
    console.error("💥 Unexpected error:", error.message);
  }
}

fixUserProfile();
