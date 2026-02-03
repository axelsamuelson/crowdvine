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
    const sb = getSupabaseAdmin();

    const { count: plpViews, error: plpError } = await sb
      .from("user_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", id)
      .eq("event_type", "product_list_viewed");

    if (plpError) throw plpError;

    const { count: pdpViews, error: pdpError } = await sb
      .from("user_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", id)
      .eq("event_type", "product_viewed");

    if (pdpError) throw pdpError;

    return NextResponse.json({
      plpViews: plpViews ?? 0,
      pdpViews: pdpViews ?? 0,
    });
  } catch (error) {
    console.error("Error in GET /api/admin/users/[id]/views:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

