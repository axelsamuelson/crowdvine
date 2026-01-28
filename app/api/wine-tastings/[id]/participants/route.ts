import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/wine-tastings/[id]/participants
 * List all participants in a session (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: sessionId } = await params;
    const sb = getSupabaseAdmin();

    // Check if user is admin
    const { data: profile } = await sb
      .from("profiles")
      .select("roles")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.roles?.includes("admin") || profile?.role === "admin";
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { data: participants, error } = await sb
      .from("wine_tasting_participants")
      .select(`
        *,
        user:profiles!wine_tasting_participants_user_id_fkey(id, email, full_name),
        ratings:wine_tasting_ratings(count)
      `)
      .eq("session_id", sessionId)
      .order("joined_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ participants: participants || [] });
  } catch (error: any) {
    console.error("Error fetching participants:", error);
    return NextResponse.json(
      { error: "Failed to fetch participants", details: error?.message },
      { status: 500 },
    );
  }
}
