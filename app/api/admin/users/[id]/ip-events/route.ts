import { NextRequest, NextResponse } from "next/server";
import { AdminAuthError, requireAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    try {
      await requireAdmin();
    } catch (error) {
      const status = error instanceof AdminAuthError ? error.status : 401;
      return NextResponse.json(
        { error: status === 403 ? "Forbidden" : "Unauthorized" },
        { status },
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: events, error } = await supabase
      .from("impact_point_events")
      .select("*")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching user IP events:", error);
      return NextResponse.json(
        { error: "Failed to fetch IP events" },
        { status: 500 },
      );
    }

    return NextResponse.json(events || []);
  } catch (error) {
    console.error("Error in GET /api/admin/users/[id]/ip-events:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
