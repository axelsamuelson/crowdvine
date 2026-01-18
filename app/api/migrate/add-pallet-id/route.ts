import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const sb = getSupabaseAdmin();

    // Check if pallet_id column exists
    const { data: bookings, error: bookingsError } = await sb
      .from("bookings")
      .select("*")
      .limit(1);

    if (bookingsError) {
      return NextResponse.json({
        error: "Failed to query bookings",
        details: bookingsError,
      });
    }

    const hasPalletId =
      bookings && bookings.length > 0 && "pallet_id" in bookings[0];

    return NextResponse.json({
      hasPalletId,
      sampleBooking: bookings?.[0] || null,
    });
  } catch (error) {
    console.error("Check error:", error);
    return NextResponse.json({ error: "Check failed" }, { status: 500 });
  }
}
