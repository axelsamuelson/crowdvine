import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";

/**
 * POST /api/wine-tastings/by-code/[code]/join
 * Join a tasting session (creates participant)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    console.log("[JOIN] Attempting to join session with code:", code);
    const sb = getSupabaseAdmin();

    // Find session by code
    const { data: session, error: sessionError } = await sb
      .from("wine_tasting_sessions")
      .select("id, status, session_code")
      .eq("session_code", code.toUpperCase())
      .single();

    console.log("[JOIN] Session lookup result:", { 
      found: !!session, 
      error: sessionError?.message,
      sessionId: session?.id 
    });

    if (sessionError || !session) {
      console.log("[JOIN] Session not found, returning 404");
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.status !== "active") {
      return NextResponse.json(
        { error: "Session is not active" },
        { status: 400 },
      );
    }

    // Check if user is logged in (optional - guests can join)
    const user = await getCurrentUser();
    console.log("[JOIN] User check:", { hasUser: !!user, userId: user?.id });
    let userId: string | null = null;
    let email: string | null = null;
    let name: string | null = null;

    if (user) {
      userId = user.id;
      email = user.email || null;
      const { data: profile } = await sb
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      name = profile?.full_name || null;
    }

    // Check if participant already exists for this session and user
    let participant;
    if (userId) {
      const { data: existing } = await sb
        .from("wine_tasting_participants")
        .select("*")
        .eq("session_id", session.id)
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        participant = existing;
      }
    }

    // If no existing participant, create new one
    if (!participant) {
      console.log("[JOIN] Creating new participant for session:", session.id);
      // Generate unique participant code
      const { data: participantCode, error: codeError } = await sb.rpc(
        "generate_participant_code",
      );
      console.log("[JOIN] RPC result:", { 
        code: participantCode, 
        error: codeError?.message,
        errorCode: codeError?.code 
      });
      
      if (codeError) {
        console.error("[JOIN] Error generating participant code:", codeError);
        return NextResponse.json(
          { error: "Failed to generate participant code", details: codeError.message },
          { status: 500 },
        );
      }
      // RPC functions return the value directly
      const code = participantCode as string;
      if (!code) {
        console.error("[JOIN] RPC returned empty code");
        return NextResponse.json(
          { error: "Failed to generate participant code" },
          { status: 500 },
        );
      }

      console.log("[JOIN] Inserting participant:", {
        session_id: session.id,
        user_id: userId,
        is_anonymous: !userId,
      });

      const { data: newParticipant, error: participantError } = await sb
        .from("wine_tasting_participants")
        .insert({
          session_id: session.id,
          user_id: userId,
          participant_code: code,
          email: email,
          name: name,
          is_anonymous: !userId,
        })
        .select()
        .single();

      console.log("[JOIN] Insert result:", { 
        participant: !!newParticipant, 
        error: participantError?.message,
        errorCode: participantError?.code,
        errorDetails: participantError?.details,
        errorHint: participantError?.hint
      });

      if (participantError) {
        console.error("[JOIN] Participant insert error:", participantError);
        return NextResponse.json(
          { error: "Failed to create participant", details: participantError.message },
          { status: 500 },
        );
      }
      participant = newParticipant;
    }

    console.log("[JOIN] Successfully joined session:", { participantId: participant.id });

    return NextResponse.json({ participant }, { status: 201 });
  } catch (error: any) {
    console.error("Error joining session:", error);
    return NextResponse.json(
      { error: "Failed to join session", details: error?.message },
      { status: 500 },
    );
  }
}
