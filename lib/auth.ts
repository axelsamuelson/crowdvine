import { createClient } from "@supabase/supabase-js";
import { isStaleRefreshTokenError } from "@/lib/auth/session-errors";
import { supabaseServer } from "@/lib/supabase-server";

// Auth roles
export type UserRole = "admin" | "producer" | "user";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  producer_id?: string;
}

// Supabase client för auth (lazy-init to avoid build-time env errors)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let cachedClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase auth credentials");
  }
  if (!cachedClient) {
    cachedClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return cachedClient;
}

// Server-side auth helpers
export async function getCurrentUser(): Promise<User | null> {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing Supabase auth credentials");
      return null;
    }
    const supabase = await supabaseServer();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) {
      if (isStaleRefreshTokenError(error)) {
        try {
          await supabase.auth.signOut();
        } catch {
          // signOut may also try to set cookies in read-only RSC context
        }
      }
      return null;
    }
    if (!user) {
      return null;
    }

    // Hämta user profile med role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, producer_id")
      .eq("id", user.id)
      .single();

    if (profileError) {
      return null;
    }

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
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({
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
  const { data, error } = await getSupabaseClient().auth.signUp({
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
    await getSupabaseClient().from("profiles").insert({
      id: data.user.id,
      role,
      email,
    });
  }

  return { data, error };
}

export async function signOut() {
  // Använd global signOut för att rensa alla sessioner
  return await getSupabaseClient().auth.signOut({ scope: "global" });
}
