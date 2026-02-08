import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sb = getSupabaseAdmin();

  const { data, error } = await sb
    .from("b2b_pallet_shipments")
    .select(
      `
      *,
      b2b_pallet_shipment_items(
        id,
        wine_id,
        quantity,
        cost_cents_override,
        wines(id, wine_name, vintage, cost_amount, cost_currency, exchange_rate, alcohol_tax_cents, producers(name))
      )
    `,
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sb = getSupabaseAdmin();
  const body = await request.json();

  const { name, shipped_at, delivered_at, cost_cents, items } = body as {
    name?: string;
    shipped_at?: string | null;
    delivered_at?: string | null;
    cost_cents?: number | null;
    items?: Array<{
      wine_id: string;
      quantity: number;
      cost_cents_override?: number | null;
    }>;
  };

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name?.trim();
  if (shipped_at !== undefined) updateData.shipped_at = shipped_at || null;
  if (delivered_at !== undefined) updateData.delivered_at = delivered_at || null;
  if (cost_cents !== undefined) updateData.cost_cents = cost_cents != null ? cost_cents : null;
  updateData.updated_at = new Date().toISOString();

  if (Object.keys(updateData).length > 1) {
    const { error: updateError } = await sb
      .from("b2b_pallet_shipments")
      .update(updateData)
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 },
      );
    }
  }

  if (items && Array.isArray(items)) {
    let soldByWineId = new Map<string, number>();
    try {
      const { data: existingItems } = await sb
        .from("b2b_pallet_shipment_items")
        .select("wine_id, quantity_sold")
        .eq("shipment_id", id);
      (existingItems || []).forEach((it: any) => {
        soldByWineId.set(it.wine_id, it.quantity_sold ?? 0);
      });
    } catch {
      /* quantity_sold column may not exist yet */
    }

    await sb.from("b2b_pallet_shipment_items").delete().eq("shipment_id", id);

    const validItems = items.filter((i: any) => i.wine_id && i.quantity > 0);
    if (validItems.length > 0) {
      const itemRows = validItems.map((i: any) => ({
        shipment_id: id,
        wine_id: i.wine_id,
        quantity: Math.max(1, Math.floor(i.quantity)),
        quantity_sold: soldByWineId.get(i.wine_id) ?? 0,
        cost_cents_override:
          i.cost_cents_override != null ? i.cost_cents_override : null,
      }));

      const { error: itemsError } = await sb
        .from("b2b_pallet_shipment_items")
        .insert(itemRows);

      if (itemsError) {
        return NextResponse.json(
          { error: itemsError.message },
          { status: 500 },
        );
      }
    }
  }

  const { data: full } = await sb
    .from("b2b_pallet_shipments")
    .select(
      `
      *,
      b2b_pallet_shipment_items(
        id,
        wine_id,
        quantity,
        cost_cents_override,
        wines(id, wine_name, vintage, cost_amount, cost_currency, exchange_rate, alcohol_tax_cents)
      )
    `,
    )
    .eq("id", id)
    .single();

  return NextResponse.json(full);
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sb = getSupabaseAdmin();

  const { error } = await sb
    .from("b2b_pallet_shipments")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
