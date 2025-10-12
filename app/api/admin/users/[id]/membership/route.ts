import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();

    const { data: membership, error } = await supabase
      .from("user_memberships")
      .select("*")
      .eq("user_id", params.id)
      .single();

    if (error) {
      console.error("Error fetching user membership:", error);
      return NextResponse.json(
        { error: "Failed to fetch membership" },
        { status: 500 }
      );
    }

    return NextResponse.json(membership);
  } catch (error) {
    console.error("Error in GET /api/admin/users/[id]/membership:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

