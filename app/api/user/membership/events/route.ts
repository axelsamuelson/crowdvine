import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/user/membership/events
 * 
 * Returns paginated impact point event history for current user
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    const sb = getSupabaseAdmin();

    // Get impact point events for user
    const { data: events, error, count } = await sb
      .from('impact_point_events')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Enrich events with related user info if needed
    const enrichedEvents = await Promise.all(
      (events || []).map(async (event) => {
        if (event.related_user_id) {
          const { data: relatedProfile } = await sb
            .from('profiles')
            .select('full_name, email')
            .eq('id', event.related_user_id)
            .single();
          
          return {
            ...event,
            profiles: relatedProfile,
          };
        }
        return event;
      })
    );

    return NextResponse.json({
      events: enrichedEvents,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    console.error("Error fetching membership events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

