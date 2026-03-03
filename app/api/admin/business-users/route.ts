import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentAdmin } from "@/lib/admin-auth-server";

/**
 * GET /api/admin/business-users?q=
 * List profiles that are "business" users: producer role, linked to producer, OR portal_access contains 'business' (B2B).
 * Used for wine tasting assignment and invoice recipient linking.
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

    // 1) Producers and profiles linked to a producer
    const { data: byRole, error: err1 } = await sb
      .from("profiles")
      .select("id, email, full_name")
      .or("role.eq.producer,producer_id.not.is.null");

    // 2) Anyone with B2B portal_access (business account), e.g. Mille Nystedt
    const { data: byPortal, error: err2 } = await sb
      .from("profiles")
      .select("id, email, full_name")
      .contains("portal_access", ["business"]);

    if (err1 || err2) {
      console.error("Error fetching business users:", err1 ?? err2);
      return NextResponse.json(
        { error: "Failed to fetch business users", details: (err1 ?? err2)?.message },
        { status: 500 },
      );
    }

    // Merge and dedupe by id
    const byId = new Map<string, { id: string; email: string | null; full_name: string | null }>();
    for (const p of [...(byRole ?? []), ...(byPortal ?? [])]) {
      if (p?.id) byId.set(p.id, { id: p.id, email: p.email ?? null, full_name: p.full_name ?? null });
    }
    let list = Array.from(byId.values()).sort((a, b) => {
      const na = (a.full_name || a.email || "").toLowerCase();
      const nb = (b.full_name || b.email || "").toLowerCase();
      return na.localeCompare(nb) || (a.email || "").localeCompare(b.email || "");
    });
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
