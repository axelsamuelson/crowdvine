import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const sb = await supabaseServer();

  try {
    // Hämta grundläggande bookings data
    const { data: bookings, error } = await sb
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Bookings debug error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      bookings: bookings || [],
      count: bookings?.length || 0,
      message: "Bookings debug data retrieved successfully",
    });
  } catch (error) {
    console.error("Bookings debug error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
