import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();

    const { data: invitations, error } = await supabase
      .from("invitation_codes")
      .select("*")
      .eq("created_by", params.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching user invitations:", error);
      return NextResponse.json(
        { error: "Failed to fetch invitations" },
        { status: 500 }
      );
    }

    return NextResponse.json(invitations || []);
  } catch (error) {
    console.error("Error in GET /api/admin/users/[id]/invitations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

