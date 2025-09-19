import { cookies } from "next/headers";
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
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set(name, value, options);
        } catch (error) {
          // Ignore cookie modification errors outside of Server Actions/Route Handlers
          console.warn(`Cannot set cookie ${name}: ${error}`);
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set(name, "", options);
        } catch (error) {
          // Ignore cookie modification errors outside of Server Actions/Route Handlers
          console.warn(`Cannot remove cookie ${name}: ${error}`);
        }
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
