import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const sb = await supabaseServer();
  const resolvedParams = await params;

  try {
    const { data, error } = await sb
      .from("wine_box_items")
      .select(
        `
        *,
        wine:wines(
          id,
          wine_name,
          vintage,
          grape_varieties,
          color,
          base_price_cents
        )
      `,
      )
      .eq("wine_box_id", resolvedParams.id);

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Error fetching wine box items:", error);
    return NextResponse.json(
      { error: "Failed to fetch wine box items" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const sb = await supabaseServer();
  const resolvedParams = await params;

  try {
    const body = await request.json();
    const { wineItems } = body;

    if (!wineItems || !Array.isArray(wineItems)) {
      return NextResponse.json(
        { error: "wineItems must be an array" },
        { status: 400 },
      );
    }

    // First, delete all existing items for this wine box
    await sb
      .from("wine_box_items")
      .delete()
      .eq("wine_box_id", resolvedParams.id);

    // Then insert the new items
    const wineBoxItems = wineItems.map((item: any) => ({
      wine_box_id: resolvedParams.id,
      wine_id: item.wineId,
      quantity: item.quantity,
    }));

    const { data, error } = await sb
      .from("wine_box_items")
      .insert(wineBoxItems)
      .select();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating wine box items:", error);
    return NextResponse.json(
      { error: "Failed to update wine box items" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const sb = await supabaseServer();
  const resolvedParams = await params;

  try {
    const body = await request.json();
    const { wineItems } = body;

    if (!wineItems || !Array.isArray(wineItems)) {
      return NextResponse.json(
        { error: "wineItems must be an array" },
        { status: 400 },
      );
    }

    // Insert wine box items
    const wineBoxItems = wineItems.map((item: any) => ({
      wine_box_id: resolvedParams.id,
      wine_id: item.wineId,
      quantity: item.quantity,
    }));

    const { data, error } = await sb
      .from("wine_box_items")
      .insert(wineBoxItems)
      .select();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error adding wines to wine box:", error);
    return NextResponse.json(
      { error: "Failed to add wines to wine box" },
      { status: 500 },
    );
  }
}
