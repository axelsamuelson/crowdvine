import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Resolves the first reservation in a checkout group for the current user.
 * Used when the success page only has checkout_group_id in the URL.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  try {
    const { groupId } = await params;
    if (!groupId || typeof groupId !== "string") {
      return NextResponse.json({ error: "Missing group id" }, { status: 400 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    const { data: row, error } = await supabase
      .from("order_reservations")
      .select("id")
      .eq("checkout_group_id", groupId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[by-checkout-group] lookup error:", error);
      return NextResponse.json(
        { error: "Failed to resolve reservation" },
        { status: 500 },
      );
    }

    if (!row?.id) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    return NextResponse.json({ reservationId: row.id });
  } catch (e) {
    console.error("[by-checkout-group]", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
