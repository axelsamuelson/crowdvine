import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentAdmin } from "@/lib/admin-auth-server";

/**
 * GET /api/me/admin
 * 
 * Check if current user is admin (via profile role OR admin cookie)
 */
export async function GET() {
  try {
    // Check admin cookie first (for admin-auth login)
    const admin = await getCurrentAdmin();
    if (admin) {
      return NextResponse.json({ isAdmin: true, method: "cookie" });
    }

    // Check profile role (for regular auth)
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ isAdmin: false });
    }

    const sb = getSupabaseAdmin();
    const { data: profile } = await sb
      .from("profiles")
      .select("roles, role")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin =
      profile?.roles?.includes("admin") ||
      profile?.role === "admin" ||
      user.roles?.includes("admin") ||
      user.role === "admin";

    return NextResponse.json({ 
      isAdmin, 
      method: isAdmin ? "profile" : null 
    });
  } catch (error) {
    console.error("Error checking admin status:", error);
    return NextResponse.json({ isAdmin: false });
  }
}
