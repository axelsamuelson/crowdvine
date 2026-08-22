"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function adminLogin(email: string, password: string) {
  try {
    console.log("Admin login attempt for:", email);

    // Skapa Supabase client med cookie-hantering
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => cookieStore.get(name)?.value,
          set: (name: string, value: string, options: any) => {
            cookieStore.set(name, value, options);
          },
          remove: (name: string, options: any) => {
            cookieStore.set(name, "", options);
          },
        },
      },
    );

    // Logga in användaren
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Login error:", error);
      return { error: `Inloggning misslyckades: ${error.message}` };
    }

    if (!data?.user) {
      return { error: "Ingen användare returnerades" };
    }

    console.log("User authenticated:", data.user.id);

    // Hämta profil för att verifiera admin-roll
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      return { error: "Kunde inte hämta användarprofil" };
    }

    // Verifiera admin-roll
    if (profile?.role !== "admin") {
      return { error: "Du har inte admin-behörighet" };
    }

    console.log("Admin role verified");

    // Returnera success istället för att använda redirect
    return { success: true };
  } catch (error: any) {
    console.error("Unexpected error in admin login:", error);
    return { error: "Ett oväntat fel uppstod" };
  }
}

export async function signOut() {
  try {
    console.log("Signing out admin user");

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => cookieStore.get(name)?.value,
          set: (name: string, value: string, options: any) => {
            cookieStore.set(name, value, options);
          },
          remove: (name: string, options: any) => {
            cookieStore.set(name, "", options);
          },
        },
      },
    );

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Sign out error:", error);
      return { error: `Utloggning misslyckades: ${error.message}` };
    }

    console.log("Admin user signed out successfully");
    return { success: true };
  } catch (error) {
    console.error("Unexpected error in sign out:", error);
    return { error: "Ett oväntat fel uppstod" };
  }
}
