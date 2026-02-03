import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";

async function ensureSessionAccess(
  sb: ReturnType<typeof getSupabaseAdmin>,
  sessionId: string,
  user: Awaited<ReturnType<typeof getCurrentUser>>,
) {
  const { data: session, error } = await sb
    .from("wine_tasting_sessions")
    .select("id, status")
    .eq("id", sessionId)
    .single();

  if (error || !session) return { allowed: false, error: 404 as const };
  const isActive = session.status === "active";

  if (isActive) return { allowed: true };

  if (!user) return { allowed: false, error: 403 as const };

  const { data: profile } = await sb
    .from("profiles")
    .select("roles, role")
    .eq("id", user.id)
    .single();
  const isAdmin =
    profile?.roles?.includes("admin") || profile?.role === "admin";

  if (isAdmin) return { allowed: true };

  const { data: participant } = await sb
    .from("wine_tasting_participants")
    .select("id")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  return { allowed: !!participant, error: 403 as const };
}

/**
 * GET /api/wine-tastings/[id]/ratings
 * List ratings for session. Optional ?participant_id=&wine_id= for single rating.
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
    const user = await getCurrentUser();
    const { allowed, error: accessError } = await ensureSessionAccess(sb, sessionId, user);
    if (!allowed) {
      return NextResponse.json(
        { error: accessError === 404 ? "Session not found" : "Access denied" },
        { status: accessError },
      );
    }

    if (participantId && wineId) {
      const { data: rating, error } = await sb
        .from("wine_tasting_ratings")
        .select("rating, comment")
        .eq("session_id", sessionId)
        .eq("participant_id", participantId)
        .eq("wine_id", wineId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching rating:", error);
        return NextResponse.json({ error: "Failed to fetch rating" }, { status: 500 });
      }
      return NextResponse.json({ rating: rating ?? null });
    }

    const { data: ratings, error } = await sb
      .from("wine_tasting_ratings")
      .select("wine_id, participant_id, rating, comment")
      .eq("session_id", sessionId);

    if (error) {
      console.error("Error fetching ratings:", error);
      return NextResponse.json({ error: "Failed to fetch ratings" }, { status: 500 });
    }

    return NextResponse.json({ ratings: ratings ?? [] });
  } catch (err: unknown) {
    console.error("Error in GET /api/wine-tastings/[id]/ratings:", err);
    return NextResponse.json(
      { error: "Failed to fetch ratings", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/wine-tastings/[id]/ratings
 * Upsert a rating. Body: { participant_id, wine_id, rating, comment? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: sessionId } = await params;
    const sb = getSupabaseAdmin();
    const user = await getCurrentUser();
    const { allowed, error: accessError } = await ensureSessionAccess(sb, sessionId, user);
    if (!allowed) {
      return NextResponse.json(
        { error: accessError === 404 ? "Session not found" : "Access denied" },
        { status: accessError },
      );
    }

    const body = await request.json().catch(() => ({}));
    const participantId = body.participant_id;
    const wineId = body.wine_id;
    let rating = body.rating;
    const comment = body.comment ?? null;

    if (!participantId || !wineId) {
      return NextResponse.json({ error: "participant_id and wine_id required" }, { status: 400 });
    }

    const num = Number(rating);
    if (Number.isNaN(num) || num < 0 || num > 100) {
      return NextResponse.json({ error: "rating must be 0–100" }, { status: 400 });
    }
    rating = Math.round(num);

    const { data: participant } = await sb
      .from("wine_tasting_participants")
      .select("id")
      .eq("id", participantId)
      .eq("session_id", sessionId)
      .single();

    if (!participant) {
      return NextResponse.json({ error: "Invalid participant" }, { status: 400 });
    }

    const { data: session } = await sb
      .from("wine_tasting_sessions")
      .select("wine_order")
      .eq("id", sessionId)
      .single();

    const wineOrder = (session?.wine_order as string[] | null) ?? [];
    if (!wineOrder.includes(wineId)) {
      return NextResponse.json({ error: "Wine not in session" }, { status: 400 });
    }

    const { data: existing } = await sb
      .from("wine_tasting_ratings")
      .select("id")
      .eq("session_id", sessionId)
      .eq("participant_id", participantId)
      .eq("wine_id", wineId)
      .maybeSingle();

    if (existing) {
      const { error: updateError } = await sb
        .from("wine_tasting_ratings")
        .update({ rating, comment })
        .eq("id", existing.id);

      if (updateError) {
        console.error("Error updating rating:", updateError);
        return NextResponse.json(
          { error: "Failed to save rating", details: updateError.message },
          { status: 500 },
        );
      }
    } else {
      const { error: insertError } = await sb
        .from("wine_tasting_ratings")
        .insert({
          session_id: sessionId,
          participant_id: participantId,
          wine_id: wineId,
          rating,
          comment,
        });

      if (insertError) {
        console.error("Error inserting rating:", insertError);
        return NextResponse.json(
          { error: "Failed to save rating", details: insertError.message },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Error in POST /api/wine-tastings/[id]/ratings:", err);
    return NextResponse.json(
      { error: "Failed to save rating", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
