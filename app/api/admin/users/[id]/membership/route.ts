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
