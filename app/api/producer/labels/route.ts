import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.producer_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("order_reservations")
    .select(
      `
      id,
      bottles,
      instabee_label_url,
      instabee_tracking_url,
      instabee_label_created_at,
      user_addresses (
        full_name,
        address_city,
        address_postcode
      )
    `,
    )
    .eq("producer_id", user.producer_id)
    .not("instabee_label_url", "is", null)
    .order("instabee_label_created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ labels: data });
}
