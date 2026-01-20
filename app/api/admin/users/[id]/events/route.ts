import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentAdmin } from "@/lib/admin-auth-server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const pageSizeRaw = Number(searchParams.get("pageSize") || "200");
    const pageSize = Math.min(500, Math.max(25, pageSizeRaw));

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const sb = getSupabaseAdmin();

    const { data: events, error, count } = await sb
      .from("user_events")
      .select(
        "id, session_id, event_type, event_category, event_metadata, page_url, referrer, user_agent, created_at",
        { count: "exact" },
      )
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    return NextResponse.json({
      page,
      pageSize,
      total: count ?? 0,
      events: events ?? [],
    });
  } catch (error) {
    console.error("Error in GET /api/admin/users/[id]/events:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

