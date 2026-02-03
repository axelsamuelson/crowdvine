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

    const { data: membership, error } = await supabase
      .from("user_memberships")
      .select("*")
      .eq("user_id", id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching user membership:", error);
      return NextResponse.json(
        { error: "Failed to fetch membership" },
        { status: 500 },
      );
    }

    // Membership can be missing for some users
    return NextResponse.json(membership ?? null);
  } catch (error) {
    console.error("Error in GET /api/admin/users/[id]/membership:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
