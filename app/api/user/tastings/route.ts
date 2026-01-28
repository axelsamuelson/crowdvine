import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/user/tastings
 * Get user's tasting history
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sb = getSupabaseAdmin();

    // Get all sessions user participated in
    const { data: participants, error: participantsError } = await sb
      .from("wine_tasting_participants")
      .select(`
        *,
        session:wine_tasting_sessions(
          id,
          session_code,
          name,
          status,
          created_at,
          completed_at
        )
      `)
      .eq("user_id", user.id)
      .order("joined_at", { ascending: false });

    if (participantsError) throw participantsError;

    // Get ratings for each session
    const sessionsWithRatings = await Promise.all(
      (participants || []).map(async (participant: any) => {
        const { data: ratings, error: ratingsError } = await sb
          .from("wine_tasting_ratings")
          .select(`
            *,
            wine:wines(id, wine_name, vintage, grape_varieties, color, label_image_path)
          `)
          .eq("participant_id", participant.id)
          .order("tasted_at", { ascending: false });

        if (ratingsError) throw ratingsError;

        return {
          participant,
          session: participant.session,
          ratings: ratings || [],
        };
      }),
    );

    return NextResponse.json({ tastings: sessionsWithRatings });
  } catch (error: any) {
    console.error("Error fetching user tastings:", error);
    return NextResponse.json(
      { error: "Failed to fetch tastings", details: error?.message },
      { status: 500 },
    );
  }
}
