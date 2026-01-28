import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";

/**
 * PATCH /api/wine-tastings/[id]/participants/[participantId]
 * Link participant to user account
 */
export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; participantId: string }>;
  },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: sessionId, participantId } = await params;
    const body = await request.json();
    const { user_id } = body;

    if (!user_id || user_id !== user.id) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400 },
      );
    }

    const sb = getSupabaseAdmin();

    // Verify participant belongs to session
    const { data: participant, error: participantError } = await sb
      .from("wine_tasting_participants")
      .select("session_id")
      .eq("id", participantId)
      .single();

    if (participantError || !participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }

    if (participant.session_id !== sessionId) {
      return NextResponse.json(
        { error: "Participant does not belong to this session" },
        { status: 400 },
      );
    }

    // Update participant with user_id
    const { data: updatedParticipant, error: updateError } = await sb
      .from("wine_tasting_participants")
      .update({
        user_id: user_id,
        is_anonymous: false,
      })
      .eq("id", participantId)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ participant: updatedParticipant });
  } catch (error: any) {
    console.error("Error linking participant:", error);
    return NextResponse.json(
      { error: "Failed to link participant", details: error?.message },
      { status: 500 },
    );
  }
}
