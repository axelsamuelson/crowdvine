import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isPlatformAdminProfile } from "@/lib/auth/platform-admin-profile";
import { getCurrentUser } from "@/lib/supabase-server";

export interface AdminUser {
  id: string;
  email: string;
  role: string;
}

export class AdminAuthError extends Error {
  readonly status: 401 | 403;

  constructor(status: 401 | 403, message: string) {
    super(message);
    this.name = "AdminAuthError";
    this.status = status;
  }
}

type ProfileRow = {
  id: string;
  email: string;
  role: string;
  roles?: unknown;
};

async function adminFromUserId(userId: string): Promise<AdminUser | null> {
  const supabase = getSupabaseAdmin();
  const { data: sessionProfile } = await supabase
    .from("profiles")
    .select("id, email, role, roles")
    .eq("id", userId)
    .maybeSingle();

  const profile = sessionProfile as ProfileRow | null;
  if (!profile || !isPlatformAdminProfile(profile)) return null;

  return {
    id: profile.id,
    email: profile.email,
    role: profile.role,
  };
}

export async function getCurrentAdmin(): Promise<AdminUser | null> {
  try {
    const user = await getCurrentUser();
    if (!user) return null;
    return await adminFromUserId(user.id);
  } catch (error) {
    console.error("Error in getCurrentAdmin:", error);
    return null;
  }
}

export async function requireAdmin(): Promise<AdminUser> {
  let user: Awaited<ReturnType<typeof getCurrentUser>>;
  try {
    user = await getCurrentUser();
  } catch (error) {
    console.error("Error in requireAdmin:", error);
    throw new AdminAuthError(401, "Admin authentication required");
  }

  if (!user) {
    throw new AdminAuthError(401, "Admin authentication required");
  }

  try {
    const admin = await adminFromUserId(user.id);
    if (!admin) {
      throw new AdminAuthError(403, "Admin access required");
    }
    return admin;
  } catch (error) {
    if (error instanceof AdminAuthError) throw error;
    console.error("Error in requireAdmin:", error);
    throw new AdminAuthError(401, "Admin authentication required");
  }
}
