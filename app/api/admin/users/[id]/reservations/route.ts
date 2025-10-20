import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = getSupabaseAdmin();

    const { data: reservations, error } = await supabase
      .from("order_reservations")
      .select(
        `
        id,
        created_at,
        status,
        order_reservation_items (
          id,
          quantity,
          wines (
            id,
            wine_name,
            vintage,
            base_price_cents
          )
        )
      `,
      )
      .eq("user_id", params.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching user reservations:", error);
      return NextResponse.json(
        { error: "Failed to fetch reservations" },
        { status: 500 },
      );
    }

    // Transform data to include total bottles
    const transformed = reservations?.map((res: any) => ({
      id: res.id,
      created_at: res.created_at,
      status: res.status,
      total_bottles:
        res.order_reservation_items?.reduce(
          (sum: number, item: any) => sum + item.quantity,
          0,
        ) || 0,
      wines:
        res.order_reservation_items?.map((item: any) => ({
          ...item.wines,
          quantity: item.quantity,
        })) || [],
    }));

    return NextResponse.json(transformed || []);
  } catch (error) {
    console.error("Error in GET /api/admin/users/[id]/reservations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
