import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentAdmin } from "@/lib/admin-auth-server";

/**
 * GET /api/admin/business-users?q=
 * List profiles that are "business" (producer role or linked to producer) for wine tasting session assignment.
 * Optional search q on email and full_name.
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    const user = await getCurrentUser();

    let isAdmin = !!admin;
    if (!isAdmin && user) {
      const sb = getSupabaseAdmin();
      const { data: profile } = await sb
        .from("profiles")
        .select("roles, role")
        .eq("id", user.id)
        .single();
      isAdmin =
        profile?.roles?.includes("admin") ||
        profile?.role === "admin" ||
        (user as { roles?: string[]; role?: string }).roles?.includes("admin") ||
        (user as { role?: string }).role === "admin";
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim().toLowerCase();

    const sb = getSupabaseAdmin();
    let query = sb
      .from("profiles")
      .select("id, email, full_name")
      .or("role.eq.producer,producer_id.not.is.null")
      .order("full_name", { ascending: true, nullsFirst: false })
      .order("email", { ascending: true });

    const { data: profiles, error } = await query;

    if (error) {
      console.error("Error fetching business users:", error);
      return NextResponse.json(
        { error: "Failed to fetch business users", details: error.message },
        { status: 500 },
      );
    }

    let list = profiles ?? [];
    if (q) {
      list = list.filter(
        (p: { email?: string | null; full_name?: string | null }) =>
          (p.email ?? "").toLowerCase().includes(q) ||
          (p.full_name ?? "").toLowerCase().includes(q),
      );
    }

    return NextResponse.json(list);
  } catch (err: unknown) {
    console.error("Error in GET /api/admin/business-users:", err);
    return NextResponse.json(
      {
        error: "Failed to fetch business users",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
