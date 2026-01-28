import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Auth roles
export type UserRole = "admin" | "producer" | "user" | "business";

export interface User {
  id: string;
  email: string;
  role: UserRole; // Primary role (for backward compatibility)
  roles: UserRole[]; // Array of all roles
  producer_id?: string;
}

// Helper function to check if user has a specific role
export function hasRole(user: User | null, role: UserRole): boolean {
  if (!user) return false;
  return user.roles?.includes(role) || user.role === role;
}

// Helper function to check if user has any of the specified roles
export function hasAnyRole(user: User | null, roles: UserRole[]): boolean {
  if (!user) return false;
  return roles.some((role) => hasRole(user, role));
}

// Helper function to get the highest role from hierarchy
export function getHighestRole(roles: UserRole[]): UserRole {
  const roleHierarchy: Record<UserRole, number> = {
    user: 0,
    business: 1,
    producer: 2,
    admin: 3,
  };

  return roles.reduce((highest, role) => {
    return roleHierarchy[role] > roleHierarchy[highest] ? role : highest;
  }, "user" as UserRole);
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

    // Hämta user profile med roles
    const { data: profile, error: profileError } = await supabaseServer
      .from("profiles")
      .select("role, roles, producer_id")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.log("Profile fetch error:", profileError);
      return null;
    }

    console.log("Profile found:", profile);

    // Use roles array if available, otherwise fallback to single role
    const roles: UserRole[] = profile?.roles && Array.isArray(profile.roles) 
      ? (profile.roles as UserRole[])
      : profile?.role 
        ? [profile.role as UserRole]
        : ["user"];

    // Get primary role (highest in hierarchy) for backward compatibility
    const primaryRole = getHighestRole(roles);

    return {
      id: user.id,
      email: user.email!,
      role: primaryRole,
      roles,
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

  // Check if user has the required role
  if (!hasRole(user, requiredRole)) {
    const roleHierarchy: Record<UserRole, number> = {
      user: 0,
      business: 1,
      producer: 2,
      admin: 3,
    };

    // Also check hierarchy (admin can access everything, etc.)
    const userHighestRole = getHighestRole(user.roles);
    if (roleHierarchy[userHighestRole] < roleHierarchy[requiredRole]) {
      throw new Error(
        `Insufficient permissions. Required: ${requiredRole}, Current roles: ${user.roles.join(", ")}`,
      );
    }
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
  roles: UserRole[] = ["user"],
) {
  const { data, error } = await getSupabaseClient().auth.signUp({
    email,
    password,
    options: {
      data: {
        roles,
      },
    },
  });

  if (data.user && !error) {
    // Skapa profile med roles
    await getSupabaseClient().from("profiles").insert({
      id: data.user.id,
      role: getHighestRole(roles), // Set primary role for backward compatibility
      roles,
      email,
    });
  }

  return { data, error };
}

export async function signOut() {
  // Använd global signOut för att rensa alla sessioner
  return await getSupabaseClient().auth.signOut({ scope: "global" });
}
