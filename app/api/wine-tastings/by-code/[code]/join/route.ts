import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";
import { randomBytes } from "crypto";

/**
 * POST /api/wine-tastings/by-code/[code]/join
 * Join a tasting session by session code. Creates or returns existing participant.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    const sb = getSupabaseAdmin();
    const user = await getCurrentUser();

    const { data: session, error: sessionError } = await sb
      .from("wine_tasting_sessions")
      .select("id, status")
      .eq("session_code", code.trim().toLowerCase())
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.status !== "active") {
      return NextResponse.json(
        { error: "Session is not active" },
        { status: 400 },
      );
    }

    let participant: { id: string; session_id: string; participant_code: string; name: string | null; is_anonymous: boolean; joined_at?: string } | null = null;

    if (user) {
      const { data: existing } = await sb
        .from("wine_tasting_participants")
        .select("id, session_id, participant_code, name, is_anonymous, created_at")
        .eq("session_id", session.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        participant = {
          id: existing.id,
          session_id: existing.session_id,
          participant_code: existing.participant_code ?? "",
          name: existing.name ?? null,
          is_anonymous: existing.is_anonymous ?? false,
          joined_at: (existing as any).created_at,
        };
      }
    }

    if (!participant) {
      const participantCode = randomBytes(4).toString("hex");
      let name: string | null = null;
      if (user) {
        const { data: profile } = await sb
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        name = profile?.full_name ?? null;
      }

      const { data: inserted, error: insertError } = await sb
        .from("wine_tasting_participants")
        .insert({
          session_id: session.id,
          user_id: user?.id ?? null,
          participant_code: participantCode,
          name,
          is_anonymous: !user,
        })
        .select("id, session_id, participant_code, name, is_anonymous, created_at")
        .single();

      if (insertError) {
        console.error("Error creating participant:", insertError);
        return NextResponse.json(
          { error: "Failed to join session", details: insertError.message },
          { status: 500 },
        );
      }

      participant = {
        id: inserted.id,
        session_id: inserted.session_id,
        participant_code: inserted.participant_code ?? participantCode,
        name: inserted.name ?? null,
        is_anonymous: inserted.is_anonymous ?? !user,
        joined_at: (inserted as any).created_at,
      };
    }

    return NextResponse.json({ participant });
  } catch (error: unknown) {
    console.error("Error in POST /api/wine-tastings/by-code/[code]/join:", error);
    return NextResponse.json(
      {
        error: "Failed to join session",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
