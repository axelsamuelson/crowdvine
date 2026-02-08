import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

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
    const { id } = await params;
    const sb = getSupabaseAdmin();
    const body = await request.json();

    const { quantity, quantity_sold } = body as {
      quantity?: number;
      quantity_sold?: number;
    };

    const updateData: Record<string, unknown> = {};

    if (quantity !== undefined) {
      const q = Math.max(0, Math.floor(quantity));
      updateData.quantity = q;
    }
    if (quantity_sold !== undefined) {
      const s = Math.max(0, Math.floor(quantity_sold));
      updateData.quantity_sold = s;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    const { data, error } = await sb
      .from("b2b_pallet_shipment_items")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Error updating pallet item:", err);
    return NextResponse.json(
      { error: "Failed to update" },
      { status: 500 },
    );
  }
}
