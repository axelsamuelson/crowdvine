import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Check admin cookie (API routes are skipped by middleware)
    const adminAuth = req.cookies.get("admin-auth")?.value;
    if (adminAuth !== "true") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
