import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await supabaseServer();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch user's reservations with basic data first
    const { data: reservations, error: reservationsError } = await supabase
      .from("order_reservations")
      .select(`
        id,
        order_id,
        status,
        created_at,
        pickup_zone_id,
        delivery_zone_id,
        payment_status,
        fulfillment_status
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (reservationsError) {
      console.error("Error fetching reservations:", reservationsError);
      console.error("Reservations error details:", {
        code: reservationsError.code,
        message: reservationsError.message,
        details: reservationsError.details,
        hint: reservationsError.hint
      });
      
      // Return empty array instead of error to prevent 500
      return NextResponse.json({
        reservations: [],
        error: reservationsError.message,
        note: "No reservations found or database error occurred"
      });
    }

    return NextResponse.json({
      reservations: reservations || [],
    });
  } catch (error) {
    console.error("Error in reservations API:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    
    // Return empty array instead of 500 error
    return NextResponse.json({
      reservations: [],
      error: error instanceof Error ? error.message : "Unknown error",
      note: "Failed to load reservations due to server error"
    });
  }
}
