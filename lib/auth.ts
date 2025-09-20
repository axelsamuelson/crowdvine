import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Auth roles
export type UserRole = "admin" | "producer" | "user";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  producer_id?: string;
}

// Supabase client för auth
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side auth helpers
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const supabaseServer = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: any) => {
          cookieStore.set(name, value, options);
        },
        remove: (name: string, options: any) => {
          cookieStore.set(name, "", options);
        },
      },
    });

    const {
      data: { user },
      error,
    } = await supabaseServer.auth.getUser();
    if (error || !user) {
      console.log("Auth error or no user:", error);
      return null;
    }

    console.log("User found in auth:", user.id);

    // Hämta user profile med role
    const { data: profile, error: profileError } = await supabaseServer
      .from("profiles")
      .select("role, producer_id")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.log("Profile fetch error:", profileError);
      return null;
    }

    console.log("Profile found:", profile);

    return {
      id: user.id,
      email: user.email!,
      role: profile?.role || "user",
      producer_id: profile?.producer_id,
    };
  } catch (error) {
    console.error("Error in getCurrentUser:", error);
    return null;
  }
}

export async function requireAuth(
  requiredRole: UserRole = "user",
): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Authentication required");
  }

  const roleHierarchy: Record<UserRole, number> = {
    user: 0,
    producer: 1,
    admin: 2,
  };

  if (roleHierarchy[user.role] < roleHierarchy[requiredRole]) {
    throw new Error(
      `Insufficient permissions. Required: ${requiredRole}, Current: ${user.role}`,
    );
  }

  return user;
}

// Client-side auth helpers
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signUp(
  email: string,
  password: string,
  role: UserRole = "user",
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role,
      },
    },
  });

  if (data.user && !error) {
    // Skapa profile med role
    await supabase.from("profiles").insert({
      id: data.user.id,
      role,
      email,
    });
  }

  return { data, error };
}

export async function signOut() {
  // Clear access cookie on client side
  document.cookie = 'cv-access=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  
  return await supabase.auth.signOut();
}
