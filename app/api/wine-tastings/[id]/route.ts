import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/wine-tastings/[id]
 * Get session details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const sb = getSupabaseAdmin();
    const user = await getCurrentUser();

    // Check if user is admin OR a participant in this session
    let isAdmin = false;
    let isParticipant = false;

    if (user) {
      // Check if user is admin
      const { data: profile, error: profileError } = await sb
        .from("profiles")
        .select("roles, role")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
      } else {
        isAdmin =
          profile?.roles?.includes("admin") ||
          profile?.role === "admin" ||
          user.roles?.includes("admin") ||
          user.role === "admin";

        // Check if user is a participant in this session
        const { data: participant } = await sb
          .from("wine_tasting_participants")
          .select("id")
          .eq("session_id", id)
          .eq("user_id", user.id)
          .maybeSingle();

        isParticipant = !!participant;
      }
    }

    // Fetch session to check access and get details
    const { data: session, error } = await sb
      .from("wine_tasting_sessions")
      .select(`
        *,
        created_by_profile:profiles!wine_tasting_sessions_created_by_fkey(id, email, full_name)
      `)
      .eq("id", id)
      .single();

    if (error || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // If session is active, allow access (for anonymous participants)
    const isActiveSession = session.status === "active";

    // Allow access if admin OR participant OR if session is active (for anonymous participants)
    if (!isAdmin && !isParticipant && !isActiveSession) {
      return NextResponse.json(
        { error: "Access denied. You must be an admin, participant, or the session must be active." },
        { status: 403 },
      );
    }

    // Get wines in order manually (since wine_order is an array, not a foreign key)
    const wineOrder = session.wine_order || [];
    let orderedWines: any[] = [];

    if (wineOrder.length > 0) {
      const { data: wines, error: winesError } = await sb
        .from("wines")
        .select(`
          id, 
          wine_name, 
          vintage, 
          grape_varieties, 
          color, 
          label_image_path, 
          description,
          base_price_cents,
          producers(name)
        `)
        .in("id", wineOrder);

      if (winesError) {
        console.error("Error fetching wines:", winesError);
      } else {
        // Create a map for quick lookup
        const winesMap = new Map(
          (wines || []).map((w: any) => [w.id, w]),
        );
        // Order wines according to wine_order array
        orderedWines = wineOrder
          .map((wineId: string) => winesMap.get(wineId))
          .filter(Boolean);
      }
    }

    return NextResponse.json({
      session: {
        ...session,
        wines: orderedWines,
      },
    });
  } catch (error: any) {
    console.error("Error fetching session:", error);
    return NextResponse.json(
      { error: "Failed to fetch session", details: error?.message },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/wine-tastings/[id]
 * Update session (admin only for most fields, but current_wine_index can be updated by admin)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const sb = getSupabaseAdmin();

    // Check if user is admin
    const { data: profile } = await sb
      .from("profiles")
      .select("roles")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.roles?.includes("admin") || profile?.role === "admin";

    const body = await request.json();
    const { current_wine_index, status, notes } = body;

    const updates: Record<string, any> = {};

    if (current_wine_index !== undefined) {
      if (!isAdmin) {
        return NextResponse.json(
          { error: "Admin access required to change wine index" },
          { status: 403 },
        );
      }
      updates.current_wine_index = current_wine_index;
    }

    if (status !== undefined) {
      if (!isAdmin) {
        return NextResponse.json(
          { error: "Admin access required to change status" },
          { status: 403 },
        );
      }
      updates.status = status;
      if (status === "completed") {
        updates.completed_at = new Date().toISOString();
      }
    }

    if (notes !== undefined) {
      if (!isAdmin) {
        return NextResponse.json(
          { error: "Admin access required to change notes" },
          { status: 403 },
        );
      }
      updates.notes = notes;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid updates provided" }, { status: 400 });
    }

    const { data: session, error } = await sb
      .from("wine_tasting_sessions")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ session });
  } catch (error: any) {
    console.error("Error updating session:", error);
    return NextResponse.json(
      { error: "Failed to update session", details: error?.message },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/wine-tastings/[id]
 * Delete session permanently (admin only)
 * Note: This will cascade delete all related ratings and participants due to ON DELETE CASCADE
 * 
 * @route DELETE /api/wine-tastings/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const sb = getSupabaseAdmin();

    // Check if user is admin
    const { data: profile } = await sb
      .from("profiles")
      .select("roles, role")
      .eq("id", user.id)
      .single();

    const isAdmin =
      profile?.roles?.includes("admin") ||
      profile?.role === "admin" ||
      user.roles?.includes("admin") ||
      user.role === "admin";

    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Delete session (cascade will delete ratings and participants)
    const { error } = await sb
      .from("wine_tasting_sessions")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Session deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting session:", error);
    return NextResponse.json(
      { error: "Failed to delete session", details: error?.message },
      { status: 500 },
    );
  }
}
