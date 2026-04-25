import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";

type PactPointsEvent = {
  id: string;
  event_type: string;
  points_delta: number;
  bottle_count: number | null;
  related_order_id: string | null;
  related_user_id: string | null;
  description: string | null;
  expires_at: string | null;
  created_at: string;
};

/**
 * GET /api/user/pact-points/events
 *
 * Returns paginated PACT Points event history for current user
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");

    const sb = getSupabaseAdmin();

    const { data: events, error, count } = await sb
      .from("pact_points_events")
      .select(
        "id,event_type,points_delta,bottle_count,related_order_id,related_user_id,description,expires_at,created_at",
        { count: "exact" },
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const safeEvents: PactPointsEvent[] = (events ?? []).map((e) => ({
      id: String(e.id),
      event_type: String(e.event_type),
      points_delta: Number(e.points_delta) || 0,
      bottle_count:
        e.bottle_count === null || e.bottle_count === undefined
          ? null
          : Number(e.bottle_count) || null,
      related_order_id:
        e.related_order_id === null || e.related_order_id === undefined
          ? null
          : String(e.related_order_id),
      related_user_id:
        e.related_user_id === null || e.related_user_id === undefined
          ? null
          : String(e.related_user_id),
      description:
        e.description === null || e.description === undefined
          ? null
          : String(e.description),
      expires_at:
        e.expires_at === null || e.expires_at === undefined
          ? null
          : String(e.expires_at),
      created_at: String(e.created_at),
    }));

    return NextResponse.json({
      events: safeEvents,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    console.error("Error fetching pact points events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 },
    );
  }
}

