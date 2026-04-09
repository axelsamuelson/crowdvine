import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isPlatformAdminProfile } from "@/lib/auth/platform-admin-profile";

export interface AdminUser {
  id: string;
  email: string;
  role: string;
}

export async function getCurrentAdmin(): Promise<AdminUser | null> {
  try {
    const cookieStore = await cookies();
    const adminAuthCookie = cookieStore.get("admin-auth");
    const adminEmailCookie = cookieStore.get("admin-email");

    if (!adminAuthCookie || adminAuthCookie.value !== "true") {
      return null;
    }

    if (!adminEmailCookie) {
      return null;
    }

    const supabase = getSupabaseAdmin();
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("id, email, role, roles")
      .eq("email", adminEmailCookie.value)
      .maybeSingle();

    if (!adminProfile || !isPlatformAdminProfile(adminProfile)) {
      return null;
    }

    return {
      id: adminProfile.id,
      email: adminProfile.email,
      role: adminProfile.role,
    };
  } catch (error) {
    console.error("Error in getCurrentAdmin:", error);
    return null;
  }
}

export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    throw new Error("Admin authentication required");
  }
  return admin;
}
