// import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

interface CookieOptions {
  maxAge?: number;
  expires?: Date;
  path?: string;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "strict" | "lax" | "none";
}

// Commented out for static export compatibility
/*
export async function supabaseServer() {
  const cookieStore = await cookies();

  // Kontrollera att miljövariabler finns
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase environment variables:");
    console.error("NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "SET" : "MISSING");
    console.error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY:",
      supabaseKey ? "SET" : "MISSING",
    );
    throw new Error(
      "Supabase environment variables are not configured. Please check your .env.local file.",
    );
  }

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        // Only set cookies in Server Actions or Route Handlers
        // This is handled by the access cookie system
        console.log(`Cookie ${name} would be set to ${value}`);
      },
      remove(name: string, options: any) {
        // Only remove cookies in Server Actions or Route Handlers
        console.log(`Cookie ${name} would be removed`);
      },
    },
  });
}

export async function getCurrentUser() {
  const supabase = await supabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("Error getting current user:", error);
    return null;
  }
  return user;
}
*/
