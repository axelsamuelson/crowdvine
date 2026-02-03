import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/wine-tastings/[id]/participants
 * List participants for a session (admin only, or session creator).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: sessionId } = await params;

    if (sessionId === "new") {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 404 });
    }

    const sb = getSupabaseAdmin();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: session, error: sessionError } = await sb
      .from("wine_tasting_sessions")
      .select("id, created_by")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const { data: profile } = await sb
      .from("profiles")
      .select("roles, role")
      .eq("id", user.id)
      .single();

    const isAdmin =
      profile?.roles?.includes("admin") || profile?.role === "admin";
    const isCreator = session.created_by === user.id;

    if (!isAdmin && !isCreator) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { data: participants, error } = await sb
      .from("wine_tasting_participants")
      .select("id, name, participant_code, is_anonymous, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching participants:", error);
      return NextResponse.json(
        { error: "Failed to fetch participants", details: error.message },
        { status: 500 },
      );
    }

    const list = (participants ?? []).map((p: any) => ({
      id: p.id,
      name: p.name ?? null,
      participant_code: p.participant_code ?? "",
      is_anonymous: p.is_anonymous ?? false,
      joined_at: p.created_at ?? new Date().toISOString(),
    }));

    return NextResponse.json({ participants: list });
  } catch (err: unknown) {
    console.error("Error in GET /api/wine-tastings/[id]/participants:", err);
    return NextResponse.json(
      {
        error: "Failed to fetch participants",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
