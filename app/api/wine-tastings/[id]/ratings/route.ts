import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";

/**
 * POST /api/wine-tastings/[id]/ratings
 * Save or update a rating and comment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: sessionId } = await params;
    const body = await request.json();
    const { participant_id, wine_id, rating, comment } = body;

    if (!participant_id || !wine_id || rating === undefined) {
      return NextResponse.json(
        { error: "participant_id, wine_id, and rating are required" },
        { status: 400 },
      );
    }

    if (rating < 0 || rating > 100) {
      return NextResponse.json(
        { error: "Rating must be between 0 and 100" },
        { status: 400 },
      );
    }

    const sb = getSupabaseAdmin();

    // Verify participant belongs to session
    const { data: participant, error: participantError } = await sb
      .from("wine_tasting_participants")
      .select("session_id")
      .eq("id", participant_id)
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

    // Verify wine is in session
    const { data: session, error: sessionError } = await sb
      .from("wine_tasting_sessions")
      .select("wine_order")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (!session.wine_order.includes(wine_id)) {
      return NextResponse.json(
        { error: "Wine is not in this session" },
        { status: 400 },
      );
    }

    // Upsert rating (insert or update)
    const { data: ratingData, error: ratingError } = await sb
      .from("wine_tasting_ratings")
      .upsert(
        {
          session_id: sessionId,
          participant_id,
          wine_id,
          rating,
          comment: comment || null,
          tasted_at: new Date().toISOString(),
        },
        {
          onConflict: "session_id,participant_id,wine_id",
        },
      )
      .select()
      .single();

    if (ratingError) throw ratingError;

    return NextResponse.json({ rating: ratingData }, { status: 201 });
  } catch (error: any) {
    console.error("Error saving rating:", error);
    return NextResponse.json(
      { error: "Failed to save rating", details: error?.message },
      { status: 500 },
    );
  }
}

/**
 * GET /api/wine-tastings/[id]/ratings
 * Get all ratings for a session or specific rating
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: sessionId } = await params;
    const { searchParams } = new URL(request.url);
    const participantId = searchParams.get("participant_id");
    const wineId = searchParams.get("wine_id");

    const sb = getSupabaseAdmin();

    let query = sb
      .from("wine_tasting_ratings")
      .select(`
        *,
        wine:wines(id, wine_name, vintage, grape_varieties, color, label_image_path),
        participant:wine_tasting_participants(id, name, participant_code, is_anonymous)
      `)
      .eq("session_id", sessionId);

    if (participantId && wineId) {
      // Get specific rating
      query = query.eq("participant_id", participantId).eq("wine_id", wineId);
      const { data: rating, error } = await query.maybeSingle();
      if (error) throw error;
      return NextResponse.json({ rating: rating || null });
    }

    // Get all ratings
    const { data: ratings, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) throw error;

    return NextResponse.json({ ratings: ratings || [] });
  } catch (error: any) {
    console.error("Error fetching ratings:", error);
    return NextResponse.json(
      { error: "Failed to fetch ratings", details: error?.message },
      { status: 500 },
    );
  }
}
