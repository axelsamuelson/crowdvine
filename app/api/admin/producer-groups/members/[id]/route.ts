import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isUnauthorizedResponse, requireAdminOr401 } from "@/lib/admin-auth-http";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const adminAuth = await requireAdminOr401();
    if (isUnauthorizedResponse(adminAuth)) return adminAuth;
    const { id } = await params;
    const sb = getSupabaseAdmin();

    const { error } = await sb
      .from("producer_group_members")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error removing producer from group:", error);
      return NextResponse.json(
        { error: "Failed to remove producer from group" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in remove producer from group API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
