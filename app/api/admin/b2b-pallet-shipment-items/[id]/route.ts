import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  b2bPalletWriteHttpError,
  updateB2bPalletShipmentItem,
} from "@/lib/admin/b2b-pallet-writes";

/**
 * PATCH /api/admin/b2b-pallet-shipment-items/[id]
 * Update quantity (inbound) or quantity_sold for a pallet item.
 * When inbound is updated on wines page, pallets page shows same data.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const sb = getSupabaseAdmin();
    const body = await request.json();
    const data = await updateB2bPalletShipmentItem(sb, id, body);
    return NextResponse.json(data);
  } catch (err) {
    const mapped = b2bPalletWriteHttpError(err);
    if (mapped.status >= 500) {
      console.error("Error updating pallet item:", err);
    }
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
