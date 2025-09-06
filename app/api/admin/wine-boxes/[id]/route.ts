import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sb = await supabaseServer();
  const resolvedParams = await params;

  try {
    const { error } = await sb
      .from("wine_boxes")
      .delete()
      .eq("id", resolvedParams.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting wine box:", error);
    return NextResponse.json(
      { error: "Failed to delete wine box" },
      { status: 500 }
    );
  }
}
