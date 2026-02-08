import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const sb = getSupabaseAdmin();

    const { data: shipments, error } = await sb
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
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching B2B pallet shipments:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(shipments || []);
  } catch (error) {
    console.error("Unexpected error in B2B pallet shipments API:", error);
    return NextResponse.json(
      { error: "Failed to fetch shipments" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const sb = getSupabaseAdmin();
    const body = await request.json();

    const { name, shipped_at, delivered_at, cost_cents, items } = body as {
      name: string;
      shipped_at?: string | null;
      delivered_at?: string | null;
      cost_cents?: number | null;
      items: Array<{
        wine_id: string;
        quantity: number;
        cost_cents_override?: number | null;
      }>;
    };

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 },
      );
    }

    const { data: shipment, error: insertError } = await sb
      .from("b2b_pallet_shipments")
      .insert({
        name: name.trim(),
        shipped_at: shipped_at || null,
        delivered_at: delivered_at || null,
        cost_cents: cost_cents != null ? cost_cents : null,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 },
      );
    }

    if (items && Array.isArray(items) && items.length > 0) {
      const itemRows = items
        .filter((i: any) => i.wine_id && i.quantity > 0)
        .map((i: any) => ({
          shipment_id: shipment.id,
          wine_id: i.wine_id,
          quantity: Math.max(1, Math.floor(i.quantity)),
          cost_cents_override:
            i.cost_cents_override != null ? i.cost_cents_override : null,
        }));

      if (itemRows.length > 0) {
        const { error: itemsError } = await sb
          .from("b2b_pallet_shipment_items")
          .insert(itemRows);

        if (itemsError) {
          console.error("Error inserting shipment items:", itemsError);
          await sb.from("b2b_pallet_shipments").delete().eq("id", shipment.id);
          return NextResponse.json(
            { error: itemsError.message },
            { status: 500 },
          );
        }
      }
    }

    const { data: full, error: fetchError } = await sb
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
      .eq("id", shipment.id)
      .single();

    if (fetchError) return NextResponse.json(shipment);
    return NextResponse.json(full);
  } catch (error) {
    console.error("Unexpected error creating B2B pallet shipment:", error);
    return NextResponse.json(
      { error: "Failed to create shipment" },
      { status: 500 },
    );
  }
}
