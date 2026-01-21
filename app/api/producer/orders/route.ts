import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "producer" && user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!user.producer_id) {
      return NextResponse.json(
        { error: "No producer linked to this account" },
        { status: 400 },
      );
    }

    const url = new URL(request.url);
    const status = url.searchParams.get("status"); // optional

    const sb = getSupabaseAdmin();

    let q = sb
      .from("order_reservations")
      .select(
        `
        id,
        created_at,
        status,
        payment_status,
        payment_deadline,
        producer_approved_at,
        producer_rejected_at,
        producer_decision_note,
        profiles (
          id,
          email,
          full_name
        ),
        user_addresses (
          address_street,
          address_city,
          address_postcode,
          country_code
        ),
        order_reservation_items (
          id,
          quantity,
          producer_decision_status,
          producer_approved_quantity,
          wines (
            id,
            wine_name,
            vintage,
            handle
          )
        )
      `,
      )
      .eq("producer_id", user.producer_id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (status) {
      q = q.eq("status", status);
    }

    const { data, error } = await q;

    if (error) {
      console.error("[Producer Orders] Error fetching orders:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ orders: data || [] });
  } catch (error: any) {
    console.error("[Producer Orders] Unexpected error:", error);
    return NextResponse.json(
      { error: error?.message || "Unknown error" },
      { status: 500 },
    );
  }
}

