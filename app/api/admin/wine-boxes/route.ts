import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET() {
  const sb = await supabaseServer();

  try {
    const { data: wineBoxes, error } = await sb
      .from("wine_boxes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(wineBoxes || []);
  } catch (error) {
    console.error("Error fetching wine boxes:", error);
    return NextResponse.json(
      { error: "Failed to fetch wine boxes" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const sb = await supabaseServer();

  try {
    const body = await request.json();
    
    const { data, error } = await sb
      .from("wine_boxes")
      .insert([body])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error creating wine box:", error);
    return NextResponse.json(
      { error: "Failed to create wine box" },
      { status: 500 }
    );
  }
}
