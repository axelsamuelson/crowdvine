import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { randomBytes } from "crypto";

/**
 * GET /api/wine-tastings
 * List sessions (admin only). Optional ?status=active|completed|archived
 * Accepts both regular auth and admin cookie auth.
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sb = getSupabaseAdmin();

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");

    let query = sb
      .from("wine_tasting_sessions")
      .select(
        `
        id,
        session_code,
        name,
        status,
        current_wine_index,
        created_at,
        completed_at,
        created_by_profile:profiles!wine_tasting_sessions_created_by_fkey(id, email, full_name)
      `,
      )
      .order("created_at", { ascending: false });

    if (statusFilter && statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data: sessions, error } = await query;

    if (error) {
      console.error("Error fetching wine tasting sessions:", error);
      return NextResponse.json(
        { error: "Failed to fetch sessions", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ sessions: sessions ?? [] });
  } catch (error: unknown) {
    console.error("Error in GET /api/wine-tastings:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch sessions",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/wine-tastings
 * Create a new session (admin only).
 * Body: { name: string, wine_order?: string[], business_user_id?: string }
 * Accepts both regular auth and admin cookie auth.
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    const user = await getCurrentUser();

    let userId: string | null = null;
    let isAdmin = false;

    if (admin) {
      userId = admin.id;
      isAdmin = true;
    } else if (user) {
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

      if (isAdmin) userId = user.id;
    }

    if (!userId || !isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sb = getSupabaseAdmin();

    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const wineOrder = Array.isArray(body.wine_order) ? body.wine_order : [];
    const businessUserId =
      typeof body.business_user_id === "string" && body.business_user_id.trim()
        ? body.business_user_id.trim()
        : null;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const sessionCode = randomBytes(4).toString("hex");

    const insertPayload: Record<string, unknown> = {
      session_code: sessionCode,
      name,
      status: "active",
      current_wine_index: 0,
      wine_order: wineOrder,
      created_by: userId,
    };
    if (businessUserId) {
      insertPayload.business_user_id = businessUserId;
    }

    const { data: session, error } = await sb
      .from("wine_tasting_sessions")
      .insert(insertPayload)
      .select(
        `
        id,
        session_code,
        name,
        status,
        current_wine_index,
        created_at,
        completed_at,
        created_by_profile:profiles!wine_tasting_sessions_created_by_fkey(id, email, full_name)
      `,
      )
      .single();

    if (error) {
      console.error("Error creating wine tasting session:", error);
      return NextResponse.json(
        { error: "Failed to create session", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ session });
  } catch (error: unknown) {
    console.error("Error in POST /api/wine-tastings:", error);
    return NextResponse.json(
      {
        error: "Failed to create session",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
