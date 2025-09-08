import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sb = await supabaseServer();
  const resolvedParams = await params;

  try {
    const { data, error } = await sb
      .from("wine_boxes")
      .select("*")
      .eq("id", resolvedParams.id)
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching wine box:", error);
    return NextResponse.json(
      { error: "Failed to fetch wine box" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sb = await supabaseServer();
  const resolvedParams = await params;

  try {
    const body = await request.json();
    const { data, error } = await sb
      .from("wine_boxes")
      .update(body)
      .eq("id", resolvedParams.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating wine box:", error);
    return NextResponse.json(
      { error: "Failed to update wine box" },
      { status: 500 }
    );
  }
}

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
