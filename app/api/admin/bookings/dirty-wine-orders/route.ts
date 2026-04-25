import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { computeInvoiceGrandTotal } from "@/lib/invoice-total";
import type { InvoiceData } from "@/types/invoice";
import type { DirtyWineOrderRow } from "@/lib/types/dirty-wine-order";
import {
  validateInvoiceForOrder,
  mapDbRowToDirtyWineOrder,
  type DirtyWineOrderDbRow,
} from "@/lib/dirty-wine-orders-server";

/**
 * GET /api/admin/bookings/dirty-wine-orders
 * Lists orders: offline from dirty_wine_orders; online reserved for future integration.
 */
export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sb = getSupabaseAdmin();
    const { data: rows, error } = await sb
      .from("dirty_wine_orders")
      .select(
        "id, order_type, order_id, order_date, customer_name, customer_email, total_cents, status, created_at, invoice_data",
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("dirty_wine_orders GET:", error);
      return NextResponse.json({ error: "Failed to fetch orders", details: error.message }, { status: 500 });
    }

    const fromDb = (rows ?? []).map((r) => mapDbRowToDirtyWineOrder(r as DirtyWineOrderDbRow));

    const orders: DirtyWineOrderRow[] = [...fromDb];

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Error fetching dirty wine orders:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

/**
 * POST /api/admin/bookings/dirty-wine-orders
 * Body: { invoice: InvoiceData } — stores as offline order (manual invoice).
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const invoice = (body as { invoice?: InvoiceData }).invoice;
    if (!invoice || typeof invoice !== "object") {
      return NextResponse.json({ error: "Missing invoice" }, { status: 400 });
    }

    const err = validateInvoiceForOrder(invoice);
    if (err) {
      return NextResponse.json({ error: err }, { status: 400 });
    }

    const totalSek = computeInvoiceGrandTotal(invoice);
    const totalCents = Math.max(0, Math.round(totalSek * 100));

    const sb = getSupabaseAdmin();
    const { data: inserted, error } = await sb
      .from("dirty_wine_orders")
      .insert({
        order_type: "offline",
        order_id: invoice.invoiceNumber.trim(),
        order_date: invoice.date || new Date().toISOString().slice(0, 10),
        customer_name: (invoice.toName ?? "").trim(),
        customer_email: (invoice.toEmail ?? "").trim(),
        total_cents: totalCents,
        status: "Manuell faktura",
        invoice_data: invoice as unknown as Record<string, unknown>,
        created_by: admin.id,
      })
      .select(
        "id, order_type, order_id, order_date, customer_name, customer_email, total_cents, status, created_at, invoice_data",
      )
      .single();

    if (error) {
      console.error("dirty_wine_orders POST:", error);
      return NextResponse.json({ error: "Failed to save order", details: error.message }, { status: 500 });
    }

    return NextResponse.json({ order: mapDbRowToDirtyWineOrder(inserted as DirtyWineOrderDbRow) });
  } catch (error) {
    console.error("Error creating dirty wine order:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
