import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/wine-tastings
 * List all wine tasting sessions (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sb = getSupabaseAdmin();

    // Check if user is admin
    const { data: profile, error: profileError } = await sb
      .from("profiles")
      .select("roles, role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return NextResponse.json(
        { error: "Failed to verify admin access", details: profileError.message },
        { status: 500 },
      );
    }

    console.log("Profile data:", { id: user.id, roles: profile?.roles, role: profile?.role });

    const isAdmin =
      profile?.roles?.includes("admin") ||
      profile?.role === "admin" ||
      user.roles?.includes("admin") ||
      user.role === "admin";

    if (!isAdmin) {
      console.log("User is not admin:", {
        userId: user.id,
        profileRoles: profile?.roles,
        profileRole: profile?.role,
        userRoles: user.roles,
        userRole: user.role,
      });
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let query = sb
      .from("wine_tasting_sessions")
      .select(`
        *,
        created_by_profile:profiles!wine_tasting_sessions_created_by_fkey(id, email, full_name)
      `)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data: sessions, error } = await query;

    if (error) throw error;

    return NextResponse.json({ sessions: sessions || [] });
  } catch (error: any) {
    console.error("Error fetching wine tasting sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions", details: error?.message },
      { status: 500 },
    );
  }
}

/**
 * POST /api/wine-tastings
 * Create a new wine tasting session (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sb = getSupabaseAdmin();

    // Check if user is admin
    const { data: profile, error: profileError } = await sb
      .from("profiles")
      .select("roles, role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return NextResponse.json(
        { error: "Failed to verify admin access", details: profileError.message },
        { status: 500 },
      );
    }

    console.log("Profile data:", { id: user.id, roles: profile?.roles, role: profile?.role });

    const isAdmin =
      profile?.roles?.includes("admin") ||
      profile?.role === "admin" ||
      user.roles?.includes("admin") ||
      user.role === "admin";

    if (!isAdmin) {
      console.log("User is not admin:", {
        userId: user.id,
        profileRoles: profile?.roles,
        profileRole: profile?.role,
        userRoles: user.roles,
        userRole: user.role,
      });
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { name, wine_ids, notes } = body;

    if (!name || !wine_ids || !Array.isArray(wine_ids) || wine_ids.length === 0) {
      return NextResponse.json(
        { error: "Name and wine_ids array are required" },
        { status: 400 },
      );
    }

    // Validate that all wine IDs exist
    const { data: wines, error: winesError } = await sb
      .from("wines")
      .select("id")
      .in("id", wine_ids);

    if (winesError) throw winesError;
    if (wines.length !== wine_ids.length) {
      return NextResponse.json(
        { error: "One or more wine IDs are invalid" },
        { status: 400 },
      );
    }

    // Generate unique session code
    const { data: codeData, error: codeError } = await sb.rpc("generate_session_code");
    if (codeError) {
      console.error("Error generating session code:", codeError);
      throw codeError;
    }
    // RPC functions return the value directly, not wrapped in an object
    const sessionCode = codeData as string;
    if (!sessionCode) {
      throw new Error("Failed to generate session code");
    }

    // Create session
    const { data: session, error: sessionError } = await sb
      .from("wine_tasting_sessions")
      .insert({
        session_code: sessionCode,
        name,
        created_by: user.id,
        wine_order: wine_ids,
        notes: notes || null,
        status: "active",
        current_wine_index: 0,
      })
      .select()
      .single();

    if (sessionError) throw sessionError;

    return NextResponse.json({ session }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating wine tasting session:", error);
    return NextResponse.json(
      { error: "Failed to create session", details: error?.message },
      { status: 500 },
    );
  }
}
