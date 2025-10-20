import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const sb = getSupabaseAdmin();

    // Delete group (members will be deleted automatically via CASCADE)
    const { error } = await sb.from("producer_groups").delete().eq("id", id);

    if (error) {
      console.error("Error deleting producer group:", error);
      return NextResponse.json(
        { error: "Failed to delete producer group" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in delete producer group API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
