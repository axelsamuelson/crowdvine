import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // Get the specific problematic pallet
    const palletId = "3985cbfe-178f-4fa1-a897-17183a1f18db";

    const { data: pallet, error } = await supabase
      .from("pallets")
      .select("id, name, bottle_capacity, is_complete, status, completed_at")
      .eq("id", palletId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get reservations for this pallet
    const { data: reservations } = await supabase
      .from("order_reservations")
      .select("id, status, payment_status, payment_deadline")
      .eq("pallet_id", palletId);

    return NextResponse.json({
      pallet: pallet,
      reservations: reservations,
      summary: {
        palletComplete: pallet.is_complete,
        palletStatus: pallet.status,
        reservationCount: reservations?.length || 0,
        pendingPaymentCount:
          reservations?.filter(
            (r) =>
              r.payment_status === "pending" || r.status === "pending_payment",
          ).length || 0,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
