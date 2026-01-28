import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/wine-tastings/[id]/summary
 * Get summary with statistics for a session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: sessionId } = await params;
    const sb = getSupabaseAdmin();

    // Get session
    const { data: session, error: sessionError } = await sb
      .from("wine_tasting_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Get all ratings
    const { data: ratings, error: ratingsError } = await sb
      .from("wine_tasting_ratings")
      .select(`
        *,
        wine:wines(id, wine_name, vintage),
        participant:wine_tasting_participants(id, name, participant_code, is_anonymous)
      `)
      .eq("session_id", sessionId);

    if (ratingsError) throw ratingsError;

    // Get wines in order manually
    const wineOrder = session.wine_order || [];
    let orderedWines: any[] = [];

    if (wineOrder.length > 0) {
      const { data: wines, error: winesError } = await sb
        .from("wines")
        .select("id, wine_name, vintage, grape_varieties, color, label_image_path, description")
        .in("id", wineOrder);

      if (!winesError && wines) {
        const winesMap = new Map(
          wines.map((w: any) => [w.id, w]),
        );
        orderedWines = wineOrder
          .map((wineId: string) => winesMap.get(wineId))
          .filter(Boolean);
      }
    }

    const wineStats = orderedWines.map((wine: any) => {
      const wineRatings = (ratings || []).filter(
        (r: any) => r.wine_id === wine.id,
      );
      const ratingsValues = wineRatings.map((r: any) => r.rating);
      const averageRating =
        ratingsValues.length > 0
          ? ratingsValues.reduce((a: number, b: number) => a + b, 0) /
            ratingsValues.length
          : null;

      return {
        wine,
        totalRatings: wineRatings.length,
        averageRating: averageRating ? Math.round(averageRating * 10) / 10 : null,
        ratings: wineRatings.map((r: any) => ({
          rating: r.rating,
          comment: r.comment,
          participant: r.participant,
          tasted_at: r.tasted_at,
        })),
      };
    });

    // Overall statistics
    const allRatings = (ratings || []).map((r: any) => r.rating);
    const overallAverage =
      allRatings.length > 0
        ? allRatings.reduce((a: number, b: number) => a + b, 0) / allRatings.length
        : null;

    // Get participant count
    const { count: participantCount } = await sb
      .from("wine_tasting_participants")
      .select("*", { count: "exact", head: true })
      .eq("session_id", sessionId);

    return NextResponse.json({
      session: {
        id: session.id,
        name: session.name,
        status: session.status,
        created_at: session.created_at,
        completed_at: session.completed_at,
      },
      statistics: {
        totalWines: orderedWines.length,
        totalParticipants: participantCount || 0,
        totalRatings: allRatings.length,
        overallAverage: overallAverage
          ? Math.round(overallAverage * 10) / 10
          : null,
      },
      wines: wineStats,
    });
  } catch (error: any) {
    console.error("Error fetching summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch summary", details: error?.message },
      { status: 500 },
    );
  }
}
