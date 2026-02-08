import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth-server";

export interface DirtyWineOrder {
  id: string;
  type: "online" | "offline";
  orderId: string;
  date: string;
  customer: string;
  email: string;
  totalCents: number;
  status: string;
  createdAt: string;
}

/**
 * GET /api/admin/bookings/dirty-wine-orders
 * Returns B2B orders (online from dirtywine.se + offline). Merged with type column.
 */
export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orders: DirtyWineOrder[] = [];

    // TODO: Fetch online orders from dirtywine.se / B2B order system when integration exists
    // For now, online orders = empty

    // TODO: Fetch offline orders from DB when b2b_offline_orders table exists
    // For now, offline orders = empty

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Error fetching dirty wine orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
